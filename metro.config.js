/* 와벨리 앱의 metro 설정.

   game/app 은 이 저장소 안에 있지만 별개의 Expo 프로젝트다(게임 「파장」).
   거기서 npm install 을 하면 node_modules 가 두 벌 생기고, 그대로 두면 이 앱의
   metro 가 그것까지 훑으며 같은 패키지를 중복으로 본다. 경로째로 제외한다.

   내부 모듈(metro-config/src/defaults/exclusionList)을 끌어다 쓰지 않고
   정규식 하나로 끝내는 이유는, 그 경로가 metro 버전을 타기 때문이다. */
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const blocked = path.resolve(__dirname, "game", "app").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
config.resolver.blockList = new RegExp(`^${blocked}[/\\\\].*$`);

module.exports = config;
