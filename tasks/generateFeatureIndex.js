require('colors');
const glob = require('glob');
const fs = require('fs');
const path = require('path');

const FEATURES_PROJECT_DIR = path.join('sauce', 'extension', 'features');
const FEATURES_INDEX_PROJECT_PATH = path.join(FEATURES_PROJECT_DIR, 'index.js');

function run(callback) {
  glob(`${FEATURES_PROJECT_DIR}/*/**/index.js`, (error, files) => {
    if (error) return callback(error);

    let imports = [];
    let errorCheckingLines = [];
    let featureNames = [];

    files.forEach((filePath) => {
      const filePathSplit = filePath.split('/');
      const projectFeaturePath = filePathSplit.slice(0, filePathSplit.length - 1).join(path.sep);

      // up one directory to use the project path
      let featureSetting = require(path.join('..', projectFeaturePath, 'settings.js')); // eslint-disable-line global-require

      if (Array.isArray(featureSetting)) {
        featureSetting = featureSetting[0];
      }

      // features/index will source from the features folder, so remove
      // `sauce/extension/features` from the path here.
      const featureIndexPath = filePathSplit.slice(3, filePathSplit.length - 1).join('/');
      const importLine = `import { ${featureSetting.name} } from './${featureIndexPath}';`;
      imports.push(importLine);

      const errorCheckingLine = `if (!${featureSetting.name}) { throw new Error('${featureSetting.name} feature failed to import. Have you set the name in the settings.js file to match the class name?'); }`;
      errorCheckingLines.push(errorCheckingLine);

      featureNames.push(featureSetting.name);
    });

    writeFeatureIndex(imports, errorCheckingLines, featureNames, callback);
  });
}

function writeFeatureIndex(importLines, errorCheckingLines, featureNames, callback) {
  const fileContents = `/*
 ***********************************************************
 * Warning: This is a file generated by the build process. *
 *                                                         *
 * Any changes you make manually will be overwritten       *
 * the next time you run webpack!                          *
 ***********************************************************
*/
${importLines.join('\n')}

${errorCheckingLines.join('\n')}

export const features = [
  ${featureNames.join(',\n  ')}
];
`;

  const featureIndexPath = path.join(__dirname, '..', FEATURES_INDEX_PROJECT_PATH);
  fs.writeFile(featureIndexPath, fileContents, callback);
}

run(error => {
  if (error) {
    console.log(`Error: ${error}`.red);
    process.exit(1);
  }

  process.exit();
});
