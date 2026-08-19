import type {
  OnResolveArgs,
  OnResolveResult,
  Plugin,
  PluginBuild,
} from "esbuild";
import { findStub, STUB_NAMESPACE, stubContents, stubId } from "./stub";
import type { StubTarget } from "./stub";

// Per-target filters (not one shared regex) so logs can name which target fired.
export function esbuildStub(targets: StubTarget[]): Plugin {
  return {
    name: "worker-trim-stub-modules",
    setup(build) {
      for (const target of targets) {
        build.onResolve(
          { filter: escapeForFilter(target.resolveFrom) },
          (args) => resolveTarget(build, target, args),
        );
      }
      build.onLoad({ filter: /.*/, namespace: STUB_NAMESPACE }, (args) => {
        const target = findStub(targets, args.path);
        if (!target) return undefined;
        return { contents: stubContents(target), loader: "js" };
      });
    },
  };
}

async function resolveTarget(
  build: PluginBuild,
  target: StubTarget,
  args: OnResolveArgs,
): Promise<OnResolveResult | undefined> {
  // Prevent the verification resolve() below from recursing into this hook.
  if (args.pluginData?.workerTrimVerifying) return undefined;

  // Confirm this resolves to the intended module, not a same-named lookalike.
  const resolved = await build.resolve(target.resolveFrom, {
    resolveDir: args.resolveDir,
    kind: args.kind,
    pluginData: { workerTrimVerifying: true },
  });
  if (resolved.errors.length > 0) return undefined;
  return { path: stubId(target), namespace: STUB_NAMESPACE };
}

function escapeForFilter(specifier: string): RegExp {
  const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}$`);
}
