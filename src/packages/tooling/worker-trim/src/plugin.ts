import type { Plugin } from "esbuild";
import type { StubTarget } from "./stub-module";

// Per-target filters (not one shared regex) so logs can name which target fired.
export function stubModulesPlugin(targets: StubTarget[]): Plugin {
  return {
    name: "worker-trim-stub-modules",
    setup(build) {
      for (const target of targets) {
        const virtualPath = `worker-trim-stub:${target.name}`;

        build.onResolve({ filter: escapeForFilter(target.resolveFrom) }, async (args) => {
          // Prevents the verification resolve() below from recursing into this same hook.
          if (args.pluginData?.workerTrimVerifying) return undefined;

          // Confirms this resolves to the intended module, not a same-named lookalike.
          const resolved = await build.resolve(target.resolveFrom, {
            resolveDir: args.resolveDir,
            kind: args.kind,
            pluginData: { workerTrimVerifying: true },
          });
          if (resolved.errors.length > 0) return undefined;
          return { path: virtualPath, namespace: "worker-trim-stub" };
        });
      }

      build.onLoad({ filter: /.*/, namespace: "worker-trim-stub" }, (args) => {
        const target = targets.find(
          (t) => `worker-trim-stub:${t.name}` === args.path,
        );
        if (!target) return undefined;
        const contents =
          typeof target.stub === "string" ? target.stub : `export ${target.stub.toString()}`;
        return { contents, loader: "js" };
      });
    },
  };
}

function escapeForFilter(specifier: string): RegExp {
  const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}$`);
}
