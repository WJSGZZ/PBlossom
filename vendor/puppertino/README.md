# Puppertino 开关

来源：https://github.com/codedgar/Puppertino

固定提交：`71faf544f9815355d525c77d4af7f1ae32d5ce3c`。MIT 许可，版权声明见 LICENSE。

- `liquid_glass.js` 来自 `src/js/liquid_glass.js`，保留完整实现；应用补丁：pointercancel 恢复按下时状态，防止页面滚动中断手势后误切换；收回时机从固定 410ms 改为读取 CSS 动画时长，在弹簧曲线 70% 的落稳点后 16ms 开始收回。
- `switch.css` 提取自 `dist/css/forms.css` 的 --p-gel 注册、隐藏 checkbox、完整 Switch 段及 focus/reduced-motion 规则，以及 `dist/css/materials.css` 的完整 Liquid Glass lens 段。未加载框架的全站表单样式。
- `app/runtime.js` 只负责 Vue 状态、业务 change 事件和动态组件增强；`app/web.css` 只接项目配色、44px 点击区域与纵向滚动。触屏尺寸沿用上游 64×28px 轨道；动画时长设为 220ms，保留上游弹簧曲线和玻璃层。

后续升级应对照固定提交检查补丁，保留源码中的作者说明与 LICENSE。

本次验证：本机 Chrome 桌面点击、鼠标拖动、空格键，以及移动视口下触摸点击、横向拖动、纵向滚动不误切换、定位失败回退、减少动态效果模式均通过。定位用模拟结果，不读取真实位置；未进行真机 iOS Safari 验收。

动效节奏复核：Chrome 移动视口采样中，原版约 700ms 才完成收回，调整后约 350ms；两次采样均无超过 25ms 的帧间隔。这只说明本机采样结果，不等同于真机性能。桌面及移动视口的快速连点、拖动、键盘、减少动态效果回归通过。
