// 서울은평 덴포스 피그마 플러그인 — 피그마 쪽 코드 (D-066, docs/FIGMA_SYNC.md 약속 C)
// 버튼 4개: 포스터 채우기 / 토큰 내보내기 / 토큰 가져오기 / KFA 글꼴 적용. 화면(ui.html)이 네트워크를 맡고, 여기서는 문서만 고친다.
// 빌드: npm run figma:plugin → figma-plugin/dist/code.js (이 파일 + poster.ts + variables.ts + fonts.ts + scripts/figma/tokens.ts + design/tokens.json)
import type { FigmaFeed } from "../../src/lib/figma-feed.ts";
import { figmaVariableToPath, MODE_DESKTOP, MODE_MOBILE, type TokensFile } from "../../scripts/figma/tokens.ts";
import { KFA_FAMILY, KFA_STYLES, missingKfaStyles, swapToKfa } from "./fonts.ts";
import { peopleFor, planFill, POSTER_PAGE, posterValues, templateKind, type LayerInfo, type PosterKind } from "./poster.ts";
import {
  describeFigmaValue,
  isVariableAlias,
  sameFigmaValue,
  tokensToVariableSpecs,
  variablesToTokens,
  type FigmaValue,
  type VariableRecord,
  type VariableSpec,
} from "./variables.ts";

/** 빌드 때 design/tokens.json 을 넣어 둔다 (build.ts) */
declare const BUNDLED_TOKENS: TokensFile;

/** 이 플러그인이 아는 피드 판 (src/lib/figma-feed.ts FIGMA_FEED_VERSION) */
const FEED_VERSION = 1;
/** 복제본 이름 앞에 붙인다 — 다음에 채울 때 템플릿으로 착각하지 않게 */
const FILLED_PREFIX = "채움 ";
const GAP = 80;

type UiMessage =
  | { type: "fill"; feed: FigmaFeed; kind: PosterKind; index: number | "all" }
  | { type: "images"; requestId: number; images: Record<string, Uint8Array | null>; errors: string[] }
  | { type: "export-tokens" }
  | { type: "import-tokens"; json?: string }
  | { type: "apply-kfa" };

function report(ok: boolean, message: string, details: string[] = []) {
  figma.ui.postMessage({ type: "result", ok, message, details });
  figma.notify(message, { error: !ok });
}

// ── 이미지 (화면에 받아 달라고 부탁) ─────────────

let nextRequestId = 1;
const pendingImages = new Map<number, (r: { images: Record<string, Uint8Array | null>; errors: string[] }) => void>();

function requestImages(urls: string[]): Promise<{ images: Record<string, Uint8Array | null>; errors: string[] }> {
  if (urls.length === 0) return Promise.resolve({ images: {}, errors: [] });
  const requestId = nextRequestId++;
  return new Promise((resolve) => {
    pendingImages.set(requestId, resolve);
    figma.ui.postMessage({ type: "need-images", requestId, urls });
  });
}

// ── 포스터 채우기 ───────────────────────────────

function isTemplateNode(n: SceneNode): n is ComponentNode | FrameNode {
  return (n.type === "COMPONENT" || n.type === "FRAME") && !n.name.startsWith(FILLED_PREFIX);
}

function layerInfo(n: SceneNode): LayerInfo {
  if (n.type === "TEXT") return { id: n.id, name: n.name, kind: "text" };
  return { id: n.id, name: n.name, kind: "fills" in n ? "shape" : "other" };
}

/** 템플릿과 같은 높이 줄에서 가장 오른쪽 + 간격 */
function nextX(template: SceneNode): number {
  const siblings = template.parent ? template.parent.children : [];
  let right = template.x + template.width;
  for (const s of siblings) {
    const overlaps = s.y < template.y + template.height && s.y + s.height > template.y;
    if (overlaps) right = Math.max(right, s.x + s.width);
  }
  return right + GAP;
}

async function setText(node: TextNode, text: string): Promise<string | null> {
  if (node.hasMissingFont) return `${node.name}: 글꼴이 설치되어 있지 않아 건너뜀`;
  const fonts = typeof node.fontName === "symbol" ? node.getRangeAllFontNames(0, node.characters.length) : [node.fontName];
  for (const f of fonts) await figma.loadFontAsync(f);
  node.characters = text;
  return null;
}

async function fillPosters(feed: FigmaFeed, kind: PosterKind, index: number | "all") {
  if (!feed || typeof feed !== "object") return report(false, "피드를 읽지 못했습니다");
  const warnings: string[] = [];
  if (feed.version !== FEED_VERSION) warnings.push(`피드 판 ${feed.version} (플러그인은 ${FEED_VERSION}) — 플러그인을 새로 빌드하세요`);

  const page = figma.root.children.find((p) => p.name.trim().startsWith(POSTER_PAGE));
  if (!page) return report(false, `'${POSTER_PAGE}' 페이지가 없습니다`);
  await page.loadAsync();
  const templates = page
    .findAll((n) => isTemplateNode(n) && templateKind(n.name) === kind && n.parent !== null && (n.parent.type === "PAGE" || n.parent.type === "SECTION"))
    .filter(isTemplateNode);
  if (templates.length === 0) return report(false, `'${POSTER_PAGE}' 에 이 포스터 템플릿이 없습니다 (이름 규칙: docs/FIGMA_SYNC.md B-3)`);

  const indexes = index === "all" ? peopleFor(feed, kind).map((_, i) => i) : [index];
  if (indexes.length === 0) indexes.push(0); // 사람이 없으면 posterValues 가 이유를 알려 준다

  type Job = { clone: FrameNode; steps: ReturnType<typeof planFill>["steps"] };
  const jobs: Job[] = [];
  for (const i of indexes) {
    const values = posterValues(feed, kind, i);
    if ("error" in values) return report(false, values.error);
    for (const t of templates) {
      const clone = t.type === "COMPONENT" ? t.createInstance().detachInstance() : t.clone();
      t.parent?.appendChild(clone);
      clone.x = nextX(t);
      clone.y = t.y;
      clone.name = `${FILLED_PREFIX}${values.title}${templates.length > 1 ? ` (${t.width}x${t.height})` : ""}`;
      const { steps, skipped } = planFill(clone.findAll().map(layerInfo), values);
      warnings.push(...skipped);
      jobs.push({ clone, steps });
    }
  }

  const urls = [...new Set(jobs.flatMap((j) => j.steps.flatMap((s) => ("image" in s && s.image ? [s.image] : []))))];
  const { images, errors } = await requestImages(urls);
  warnings.push(...errors);
  const hashes = new Map<string, string>();
  for (const [url, bytes] of Object.entries(images)) {
    if (!bytes) continue;
    try {
      hashes.set(url, figma.createImage(bytes).hash);
    } catch {
      warnings.push(`이미지를 넣지 못했습니다: ${url}`);
    }
  }

  for (const job of jobs) {
    for (const step of job.steps) {
      const node = (await figma.getNodeByIdAsync(step.id)) as SceneNode | null;
      if (!node) continue;
      if ("text" in step) {
        const w = await setText(node as TextNode, step.text);
        if (w) warnings.push(w);
      } else if (step.image && hashes.has(step.image)) {
        (node as GeometryNode).fills = [{ type: "IMAGE", scaleMode: "FILL", imageHash: hashes.get(step.image)! }];
      }
    }
  }

  await figma.setCurrentPageAsync(page);
  const clones = jobs.map((j) => j.clone);
  page.selection = clones;
  figma.viewport.scrollAndZoomIntoView(clones);
  report(true, `포스터 ${clones.length}장을 채웠습니다`, [...new Set(warnings)]);
}

// ── 토큰 내보내기 ───────────────────────────────

async function resolveValue(value: VariableValue, modeName: string, depth = 0): Promise<VariableValue> {
  if (typeof value !== "object" || value === null || !("type" in value) || value.type !== "VARIABLE_ALIAS" || depth > 10) return value;
  const target = await figma.variables.getVariableByIdAsync(value.id);
  if (!target) return value;
  const col = await figma.variables.getVariableCollectionByIdAsync(target.variableCollectionId);
  const modeId = col?.modes.find((m) => m.name === modeName)?.modeId ?? col?.defaultModeId ?? Object.keys(target.valuesByMode)[0];
  return resolveValue(target.valuesByMode[modeId], modeName, depth + 1);
}

function desktopMode(col: VariableCollection): string {
  return col.modes.find((m) => m.name === MODE_DESKTOP)?.modeId ?? col.defaultModeId;
}

async function exportTokens() {
  const cols = (await figma.variables.getLocalVariableCollectionsAsync()).filter((c) => !c.remote);
  const vars = await figma.variables.getLocalVariablesAsync();
  const records: VariableRecord[] = [];
  for (const v of vars) {
    const col = cols.find((c) => c.id === v.variableCollectionId);
    if (!col || !figmaVariableToPath(col.name, v.name)) continue;
    const mobileId = col.modes.find((m) => m.name === MODE_MOBILE)?.modeId;
    const record: VariableRecord = {
      collection: col.name,
      name: v.name,
      type: v.resolvedType,
      desktop: (await resolveValue(v.valuesByMode[desktopMode(col)], MODE_DESKTOP)) as FigmaValue | boolean,
    };
    if (mobileId) record.mobile = (await resolveValue(v.valuesByMode[mobileId], MODE_MOBILE)) as FigmaValue | boolean;
    records.push(record);
  }
  const { tokens, skipped } = variablesToTokens(records);
  figma.ui.postMessage({ type: "exported", json: `${JSON.stringify(tokens, null, 2)}\n`, count: records.length - skipped.length, skipped });
}

// ── 토큰 가져오기 ───────────────────────────────

async function importTokens(tokens: TokensFile) {
  let specs: VariableSpec[];
  try {
    specs = tokensToVariableSpecs(tokens);
  } catch (e) {
    return report(false, `tokens.json 을 읽지 못했습니다: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (specs.length === 0) return report(false, "토큰이 하나도 없습니다");

  const cols = (await figma.variables.getLocalVariableCollectionsAsync()).filter((c) => !c.remote);
  const vars = await figma.variables.getLocalVariablesAsync();
  const problems: string[] = [];
  let created = 0;
  let updated = 0;
  let same = 0;

  for (const name of [...new Set(specs.map((s) => s.collection))]) {
    const group = specs.filter((s) => s.collection === name);
    let col = cols.find((c) => c.name.trim().toLowerCase() === name.toLowerCase());
    if (!col) {
      col = figma.variables.createVariableCollection(name);
      cols.push(col);
    }
    if (!col.modes.some((m) => m.name === MODE_DESKTOP)) {
      if (col.modes.length === 1) col.renameMode(col.defaultModeId, MODE_DESKTOP);
      else problems.push(`${name}: '${MODE_DESKTOP}' 모드가 없어 기본 모드에 넣었습니다`);
    }
    let mobileId = col.modes.find((m) => m.name === MODE_MOBILE)?.modeId;
    if (!mobileId && group.some((s) => s.mobile !== undefined)) {
      try {
        mobileId = col.addMode(MODE_MOBILE);
      } catch (e) {
        problems.push(`${name}: '${MODE_MOBILE}' 모드를 만들지 못했습니다 (${e instanceof Error ? e.message : String(e)})`);
      }
    }
    const desktopId = desktopMode(col);

    for (const spec of group) {
      const collection = col;
      let v = vars.find((x) => x.variableCollectionId === collection.id && figmaVariableToPath(collection.name, x.name) === spec.name);
      if (v && v.resolvedType !== spec.type) {
        problems.push(`${spec.name}: 피그마 변수 종류(${v.resolvedType})가 토큰(${spec.type})과 달라 건너뜀`);
        continue;
      }
      let changed = false;
      const isNew = !v;
      if (!v) {
        v = figma.variables.createVariable(spec.name, collection, spec.type);
        vars.push(v);
      }
      const wanted: Array<[string, string, FigmaValue]> = [[desktopId, MODE_DESKTOP, spec.desktop]];
      if (mobileId) wanted.push([mobileId, MODE_MOBILE, spec.mobile ?? spec.desktop]);
      for (const [modeId, modeName, value] of wanted) {
        const current = v.valuesByMode[modeId];
        // 별칭(다른 변수 참조)은 디자이너가 일부러 이은 것 — 고정값으로 덮지 않는다. 참조 값이 다르면 알려만 준다
        if (isVariableAlias(current)) {
          const resolved = await resolveValue(current, modeName);
          if (!sameFigmaValue(spec.type, resolved, value)) {
            problems.push(`${spec.name} [${modeName}]: 다른 변수를 참조하는 별칭이라 바꾸지 않았습니다 (참조 값 ${describeFigmaValue(resolved)}, 토큰 ${describeFigmaValue(value)})`);
          }
          continue;
        }
        if (!sameFigmaValue(spec.type, current, value)) {
          v.setValueForMode(modeId, value);
          changed = true;
        }
      }
      if (isNew) created++;
      else if (changed) updated++;
      else same++;
    }
  }
  report(problems.length === 0, `토큰 가져오기: 새로 ${created}개, 바꿈 ${updated}개, 그대로 ${same}개`, problems);
}

// ── KFA 글꼴 적용 ───────────────────────────────

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** 인스턴스 안 레이어인지 — 원본 컴포넌트를 먼저 바꾸면 따라 바뀌므로 나중에 본다 */
function insideInstance(n: BaseNode): boolean {
  for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true;
  return false;
}

async function applyKfaFont() {
  const available = (await figma.listAvailableFontsAsync()).map((f) => f.fontName);
  const missing = missingKfaStyles(available);
  if (missing.length > 0) {
    return report(false, `글꼴이 설치되어 있지 않습니다: ${KFA_FAMILY} ${missing.join(", ")}`, [
      "이 컴퓨터에 KFA고딕(Regular, Bold)을 설치하고 피그마 데스크톱을 다시 연 뒤 눌러 주세요. 아무것도 바꾸지 않았습니다.",
    ]);
  }
  for (const style of KFA_STYLES) await figma.loadFontAsync({ family: KFA_FAMILY, style });

  const failures: string[] = [];
  let styles = 0;
  for (const st of await figma.getLocalTextStylesAsync()) {
    const target = swapToKfa(st.fontName);
    if (!target) continue;
    try {
      st.fontName = target;
      styles++;
    } catch (e) {
      failures.push(`글꼴 스타일 '${st.name}': ${errText(e)}`);
    }
  }

  let layers = 0;
  for (const page of figma.root.children) {
    await page.loadAsync();
    const texts = page.findAll((n) => n.type === "TEXT") as TextNode[];
    texts.sort((a, b) => Number(insideInstance(a)) - Number(insideInstance(b)));
    for (const t of texts) {
      let changed = false;
      const segments =
        t.characters.length > 0
          ? t.getStyledTextSegments(["fontName"])
          : typeof t.fontName === "symbol"
            ? []
            : [{ start: 0, end: 0, characters: "", fontName: t.fontName }];
      for (const seg of segments) {
        const target = swapToKfa(seg.fontName);
        if (!target) continue;
        try {
          await figma.loadFontAsync(seg.fontName).catch(() => undefined); // 옛 글꼴이 없어도 바꿀 수는 있다
          if (seg.end > seg.start) t.setRangeFontName(seg.start, seg.end, target);
          else t.fontName = target;
          changed = true;
        } catch (e) {
          failures.push(`${page.name} / ${t.name}: ${errText(e)}`);
        }
      }
      if (changed) layers++;
    }
  }
  report(failures.length === 0, `KFA 글꼴 적용: 글꼴 스타일 ${styles}개, 텍스트 레이어 ${layers}개를 바꿨습니다`, failures.slice(0, 50));
}

// ── 시작 ────────────────────────────────────────

figma.showUI(__html__, { width: 380, height: 560, title: "덴포스 피그마 동기화" });
figma.ui.postMessage({ type: "init", bundledTokens: Object.keys(BUNDLED_TOKENS).filter((k) => !k.startsWith("$")) });

figma.ui.onmessage = (raw: unknown) => {
  const msg = raw as UiMessage;
  const run = async () => {
    if (msg.type === "fill") await fillPosters(msg.feed, msg.kind, msg.index);
    else if (msg.type === "images") {
      pendingImages.get(msg.requestId)?.({ images: msg.images, errors: msg.errors });
      pendingImages.delete(msg.requestId);
    } else if (msg.type === "export-tokens") await exportTokens();
    else if (msg.type === "apply-kfa") await applyKfaFont();
    else if (msg.type === "import-tokens") {
      let tokens = BUNDLED_TOKENS;
      if (msg.json) {
        try {
          tokens = JSON.parse(msg.json) as TokensFile;
        } catch {
          return report(false, "붙여 넣은 글이 JSON 이 아닙니다");
        }
      }
      await importTokens(tokens);
    }
  };
  run().catch((e: unknown) => report(false, `오류: ${e instanceof Error ? e.message : String(e)}`));
};
