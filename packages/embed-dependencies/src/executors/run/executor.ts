import { injectDependencies } from '@embed-dependencies/deps-injecting';
import { copyDist } from '@embed-dependencies/dist-copying';
import { fixPackageJson } from '@embed-dependencies/package-json';
import { ExecutorContext } from '@nrwl/devkit';
import { toError } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { EmbedDependenciesExecutorSchema } from './schema';

export default async function runExecutor(
  options: EmbedDependenciesExecutorSchema,
  context: ExecutorContext
): Promise<{
  success: boolean;
}> {
  const sourcePath = join(context.cwd, options.sourceDist, context.projectName);
  const targetPath = join(context.cwd, options.outputPath);

  return await pipe(
    copyDist(sourcePath, targetPath),
    T.chain(() => T.fromIO(injectDependencies(context, targetPath))),
    T.chain(() => T.fromIO(fixPackageJson(targetPath))),
    TE.chain(() =>
      TE.tryCatch(async () => {
        process.chdir(targetPath);
        execSync('npm install');
      }, toError)
    ),
    TE.fold(
      () => T.of({ success: false }),
      () => T.of({ success: true })
    ),
    (t) => t()
  );
}
