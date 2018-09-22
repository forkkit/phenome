const codeToAst = require('../compiler-utils/code-to-ast');
const astToCode = require('../compiler-utils/ast-to-code');
const objectIsPhenomeComponent = require('./object-is-phenome-component');

const CompilerState = require('../compiler-utils/compiler-state');
const getComponentVisitor = require('./get-component-visitor');
const parseCommentCommands = require('./parse-conditional-comments');
const parseTypescriptExtras = require('./parse-typescript-extras');
const replaceEnvironmentVars = require('./replace-environment-vars');
const removeConstantConditions = require('./remove-constant-conditions');
const processDeclarations = require('./process-declarations');
const processImports = require('./process-imports');
const porcessReplaceComponentNode = require('./process-replace-component-node');
const processExports = require('./process-exports');

function generator(jsxTransformer, componentTransformer, typescriptGenerator) {
  function generate(componentString, config, input, output) {
    const state = new CompilerState(config, output);

    let modifiedComponentString = componentString;
    modifiedComponentString = parseCommentCommands(modifiedComponentString, config);
    modifiedComponentString = replaceEnvironmentVars(modifiedComponentString, config);

    const typescriptExtras = parseTypescriptExtras(modifiedComponentString, config);

    const ast = codeToAst(modifiedComponentString);

    if (!objectIsPhenomeComponent(ast)) {
      return {
        componentCode: componentString,
        runtimeHelpers: [],
        transformed: false,
      };
    }

    removeConstantConditions(ast);

    const { name, functional, componentNode, componentExportNode } = getComponentVisitor(ast);
    const { helpers: jsxHelpers } = jsxTransformer({ ast, name, functional, componentNode, state, config });
    componentTransformer({ ast, name, functional, componentNode, state, config, jsxHelpers });
    if (config.typeScriptDefinitions && typescriptGenerator) {
      typescriptGenerator({
        ast, name, functional, componentNode, state, config, input, typescriptExtras,
      });
    }

    processDeclarations(ast, state.declarations);
    processImports(ast, state.imports);
    porcessReplaceComponentNode(ast, componentExportNode, state.newComponentNode);
    processExports(ast, state.exports);

    return {
      componentCode: astToCode(ast),
      typeScriptDefinition: state.typeScriptDefinition,
      runtimeHelpers: state.runtimeHelpers,
      transformed: true,
    };
  }
  return generate;
}
module.exports = generator;
