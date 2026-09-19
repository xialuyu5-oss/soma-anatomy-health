# SOMA 素材、署名与许可

制作方式：**ChatGPT Vibe Coding**。这一说明只描述应用的开发方式，不替代第三方素材的署名与许可证。

## 解剖模型与解剖截图

`assets/skeleton.glb`、`muscles.glb`、`nerves.glb`、`vessels.glb`、`organs.glb`、`lymph.glb`、`joints.glb` 来自 [Dr. Murat Altun / anatomi-simulatoru](https://github.com/DrMuratAltun/anatomi-simulatoru)，固定版本 `37e85dfbbb398e11ba33c8f0e411f06f9bba592f`。本仓库保留下载的 GLB 原始字节，页面进行统一显示尺度和颜色处理。

必须保留的来源署名：

- **BodyParts3D, © The Database Center for Life Science (DBCLS)**，原始数据 [CC BY-SA 2.1 Japan](https://creativecommons.org/licenses/by-sa/2.1/jp/)，[项目主页](https://lifesciencedb.jp/bp3d/)。
- **Z-Anatomy**， [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)，[项目仓库](https://github.com/Z-Anatomy/Models-of-human-anatomy)。
- **Dr. Murat Altun / anatomi-simulatoru**，GLB 转换与减面版本，**CC BY-SA 4.0**。

七套 GLB 以及本仓库中的解剖渲染截图 `docs/images/anatomy.png`、`docs/images/atlas.png` 按 **CC BY-SA 4.0** 分发。截图由 SOMA 渲染并叠加应用界面，未改变人体几何；截图中的界面图形也在这些图片范围内按相同许可提供。不得将解剖模型标为 CC0。

上游原始通知完整保留于 [ATTRIBUTION.md](assets/anatomy/ATTRIBUTION.md) 和 [LICENSE-DATA.md](assets/anatomy/LICENSE-DATA.md)。它们描述上游项目目录和 Three.js r185，不代表本项目使用 r185；本项目实际渲染库见下文。未使用上游商标图片。来源 URL 与 SHA-256 见 [manifest.json](assets/anatomy/manifest.json)。

## MakeHuman 人体与衣物资产

仅使用数据资产，没有复制 MakeHuman AGPL 应用程序代码。资产许可声明保留于 [LICENSE.ASSETS.md](assets/source/LICENSE.ASSETS.md) 与每件 MHCLO / 材质源文件。

| 资产 | 作者 / 来源 | 许可与处理 |
| --- | --- | --- |
| hm08 人体、形态目标、骨架、权重、眼部 | MakeHuman Community；Data Collection AB、Joel Palmius、Jonas Hauquier 等 | CC0-1.0；成人与原版儿童体表数据，转换和组合用于外形示意。 |
| casual / elegant / sport 套装、休闲裤、运动鞋与袜子、眉毛、头发 | MakeHuman system assets 及源文件署名作者 | CC0-1.0；衣片拆分、平滑、局部余量、细分和显示遮挡。 |
| elvs_crude_t-shirt_male | MakeHuman edited by Elvaerwyn | CC0-1.0；保留为源资产，当前默认上衣采用系统套装衣片。 |
| joepal_crude_t-shirt_female | Joel Palmius | CC0-1.0；保留人体映射和源网格。 |
| toigo_fisherman_sweater | MargaretToigo | CC0-1.0；保留网格和纹理来源，当前以纯色细分材质显示。 |
| toigo_stiletto_booties | MargaretToigo / MRT | CC0-1.0；浅口高跟鞋为本地派生，通过曲线裁去靴筒，保留鞋头、鞋底与细跟，详见 `pumps.js`。 |
| 薄透袜层 | 从本项目选用的 CC0 人体腿部网格派生 | CC0-1.0；紧贴几何层和透明材质。 |

人体源版本：`a8bc2d54ff0ac92e78ff71431b1023eda42bf482`。文件来源与哈希见 [assets/manifest.json](assets/manifest.json) 和 [assets/makehuman/manifest.json](assets/makehuman/manifest.json)。

公开素材包入口：[MakeHuman system assets](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html)、[shirts01](https://static.makehumancommunity.org/assets/assetpacks/shirts01.html)、[shoes01](https://static.makehumancommunity.org/assets/assetpacks/shoes01.html)。未包含许可声明冲突的候选裤袜素材。

`docs/images/body-comparison.png` 是以上资产的 SOMA 实际渲染截图；该整张图片以 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 提供，底层 CC0 资产仍保持 CC0。

## Three.js

- 原版解剖视图：r160，MIT，通知见 [vendor/three-r160.LICENSE](vendor/three-r160.LICENSE)。
- 新版体型视图：0.180.0，MIT，通知见 [vendor/three/LICENSE](vendor/three/LICENSE)。

## 应用代码

应用代码尚未指定统一的开源许可证。以上第三方许可证仅适用于各自的素材与库；不因仓库公开而被改写。模型、依赖、截图与应用代码应分别识别许可范围。
