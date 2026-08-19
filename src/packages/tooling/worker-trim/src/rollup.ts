import type { Plugin, ResolvedId } from "rollup";
import {
  findStub,
  isRelative,
  partitionStubs,
  STUB_NAMESPACE,
  stubContents,
  stubId,
} from "./stub";
import type { StubTarget } from "./stub";

// Rollup counterpart of the esbuild plugin: match resolveFrom, verify it
// resolves to the intended module, then substitute a \0-prefixed virtual stub
// so tooling ignores it.
export function rollupStub(targets: StubTarget[]): Plugin {
  const { bareBySpecifier, relativeTargets } = partitionStubs(targets);

  return {
    name: "worker-trim-stub-modules-rollup",
    async resolveId(source, importer) {
      if (!importer) return null;
      const resolve = (specifier: string) =>
        this.resolve(specifier, importer, { skipSelf: true });

      if (!isRelative(source)) {
        const target = bareBySpecifier.get(source);
        return target ? await stubIfResolves(resolve, target) : null;
      }

      // Relative specifiers are importer-relative, so match on text first, then
      // confirm each candidate actually resolves from this importer.
      for (const target of relativeTargets) {
        if (target.resolveFrom !== source) continue;
        const stub = await stubIfResolves(resolve, target);
        if (stub) return stub;
      }
      return null;
    },
    load(id) {
      if (!id.startsWith(`\0${STUB_NAMESPACE}:`)) return null;
      const target = findStub(targets, id.slice(1));
      if (!target) return null;
      return { code: stubContents(target), moduleSideEffects: false };
    },
  };
}

// Verify it resolves to the intended module, not a lookalike.
async function stubIfResolves(
  resolve: (specifier: string) => Promise<ResolvedId | null>,
  target: StubTarget,
) {
  if (!(await resolve(target.resolveFrom))) return null;
  return { id: `\0${stubId(target)}` };
}
