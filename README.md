# 水影笺 · 把千里江山搅进水里

唐人流沙笺数字拓印 H5。以水为纸，滴墨吹引，覆纸成笺。

![技术](https://img.shields.io/badge/WebGL-Navier--Stokes-1d2a26) ![协议](https://img.shields.io/badge/%E7%B4%A0%E6%9D%90-%E5%85%A8%E7%A8%8B%E5%BA%8F%E7%94%9F%E6%88%90-a5382b)

## 玩法

1. **滴墨**：点一下池面，落一滴矿彩
2. **吹墨**：划动手指，引水走墨；按住不动，墨从笔尖渗出
3. **纹样保底**：云纹 / 浪纹 / 漩涡，一键出好图
4. **覆纸拓印**：颜料沉淀上纸，得一张 720×1040 的流沙笺——宣纸纹理、洒金、朱砂印、唐诗笺文、全球唯一编号，可直接保存发小红书

双墨盘：**青绿**（千里江山矿彩，主打）× **松烟**（水墨烟雾）。

演示钩子：`?demo=shui-xuan-print`（自动：切松烟 → 入漩涡 → 覆纸）。

## 技术

- 自研 WebGL 流体引擎：Navier-Stokes 稳定流体 + 涡量约束，8-pass 管线（管线参照 [Pavel Dobryakov/WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation)，MIT）
- 墨池深色水底渲染（加色）/ 拓印暖宣纸渲染（色相保持模型：色相看比例、深浅看浓度，补色相叠变深不发粉）
- 拓印成笺：Canvas 2D 程序绘制——宣纸纤维、洒金、题签竖排唐诗（公版）、残缺边朱砂印、编号年款
- 纯静态零依赖零素材，无构建；移动端自适应（染料 640 / 物理 112 / 压力迭代 20）
- WebGL2 优先，WebGL1 + OES_texture_half_float 兜底；上下文丢失自动恢复

## 本地运行

```bash
python3 -m http.server 8137
# 打开 http://localhost:8137
```

（需 http:// 或 https://，直接双击 file:// 也可以，脚本均为经典加载不依赖模块。）

## 线上

- **Cloudflare Pages（主推，大陆可达）**：`shuiyingjian.pages.dev`
- Vercel 镜像：`shuiyingjian.vercel.app`（大陆直连受限）
- 更新部署（Cloudflare）：组干净目录后 `npx wrangler pages deploy <目录> --project-name=shuiyingjian --branch=main`
