// 피그마 플러그인 API 중 이 플러그인이 쓰는 부분만 적은 최소 타입 (D-066).
// 공식 타입 패키지(@figma/plugin-typings)는 새 의존성이라 넣지 않았다 (DEPENDENCY_POLICY) — 쓰는 API 가 늘면 여기에 더한다.
// 기준 문서: https://www.figma.com/plugin-docs/api/api-reference/

type RGBA = { r: number; g: number; b: number; a: number };
type VariableAlias = { type: "VARIABLE_ALIAS"; id: string };
type VariableResolvedDataType = "BOOLEAN" | "COLOR" | "FLOAT" | "STRING";
type VariableValue = boolean | string | number | RGBA | VariableAlias;

interface Variable {
  readonly id: string;
  name: string;
  readonly resolvedType: VariableResolvedDataType;
  readonly variableCollectionId: string;
  readonly valuesByMode: { [modeId: string]: VariableValue };
  readonly remote: boolean;
  setValueForMode(modeId: string, newValue: VariableValue): void;
}

interface VariableCollection {
  readonly id: string;
  name: string;
  readonly modes: ReadonlyArray<{ modeId: string; name: string }>;
  readonly defaultModeId: string;
  readonly remote: boolean;
  addMode(name: string): string;
  renameMode(modeId: string, newName: string): void;
}

interface FontName {
  family: string;
  style: string;
}

interface Image {
  readonly hash: string;
}

type ImagePaint = { type: "IMAGE"; scaleMode: "FILL" | "FIT" | "CROP" | "TILE"; imageHash: string | null };
type Paint = ImagePaint | { type: string; [key: string]: unknown };

interface BaseNode {
  readonly id: string;
  name: string;
  readonly type: string;
  readonly parent: (BaseNode & ChildrenMixin) | null;
  readonly removed: boolean;
}

interface ChildrenMixin {
  readonly children: ReadonlyArray<SceneNode>;
  appendChild(child: SceneNode): void;
  insertChild(index: number, child: SceneNode): void;
  findAll(callback?: (node: SceneNode) => boolean): SceneNode[];
}

interface SceneNode extends BaseNode {
  x: number;
  y: number;
  readonly width: number;
  readonly height: number;
}

interface GeometryNode extends SceneNode {
  fills: ReadonlyArray<Paint> | symbol;
}

interface TextNode extends GeometryNode {
  readonly type: "TEXT";
  characters: string;
  fontName: FontName | symbol;
  readonly hasMissingFont: boolean;
  getRangeAllFontNames(start: number, end: number): FontName[];
  getStyledTextSegments(fields: ["fontName"]): Array<{ start: number; end: number; characters: string; fontName: FontName }>;
  setRangeFontName(start: number, end: number, value: FontName): void;
}

interface TextStyle {
  readonly id: string;
  name: string;
  fontName: FontName;
}

interface FrameNode extends GeometryNode, ChildrenMixin {
  readonly type: "FRAME";
  clone(): FrameNode;
}

interface ComponentNode extends GeometryNode, ChildrenMixin {
  readonly type: "COMPONENT";
  createInstance(): InstanceNode;
}

interface InstanceNode extends GeometryNode, ChildrenMixin {
  readonly type: "INSTANCE";
  detachInstance(): FrameNode;
}

interface PageNode extends BaseNode, ChildrenMixin {
  readonly type: "PAGE";
  selection: ReadonlyArray<SceneNode>;
  loadAsync(): Promise<void>;
}

interface DocumentNode extends BaseNode {
  readonly children: ReadonlyArray<PageNode>;
}

interface PluginAPI {
  readonly root: DocumentNode;
  readonly currentPage: PageNode;
  readonly mixed: symbol;
  readonly ui: {
    postMessage(msg: unknown): void;
    onmessage: ((msg: unknown) => void) | undefined;
  };
  readonly viewport: { scrollAndZoomIntoView(nodes: ReadonlyArray<BaseNode>): void };
  readonly variables: {
    getLocalVariableCollectionsAsync(): Promise<VariableCollection[]>;
    getLocalVariablesAsync(type?: VariableResolvedDataType): Promise<Variable[]>;
    getVariableByIdAsync(id: string): Promise<Variable | null>;
    getVariableCollectionByIdAsync(id: string): Promise<VariableCollection | null>;
    createVariableCollection(name: string): VariableCollection;
    createVariable(name: string, collection: VariableCollection, resolvedType: VariableResolvedDataType): Variable;
  };
  showUI(html: string, options?: { width?: number; height?: number; title?: string }): void;
  setCurrentPageAsync(page: PageNode): Promise<void>;
  getNodeByIdAsync(id: string): Promise<BaseNode | null>;
  loadFontAsync(font: FontName): Promise<void>;
  listAvailableFontsAsync(): Promise<Array<{ fontName: FontName }>>;
  getLocalTextStylesAsync(): Promise<TextStyle[]>;
  createImage(data: Uint8Array): Image;
  notify(message: string, options?: { error?: boolean; timeout?: number }): void;
}

declare const figma: PluginAPI;
declare const __html__: string;
