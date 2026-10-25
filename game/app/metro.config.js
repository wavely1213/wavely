/* 공유 코어는 이 프로젝트 바깥(game/src)에 있다.
   metro 는 projectRoot 밖의 파일을 기본으로 안 보므로 감시 폴더에 넣어 준다. */
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const coreRoot = path.resolve(projectRoot, "..", "src");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [coreRoot];
/* 공유 코어에서 시작하는 import 도 이 프로젝트의 node_modules 에서 풀리게 한다 */
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

module.exports = config;
