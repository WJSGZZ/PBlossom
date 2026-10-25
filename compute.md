# 一次性计算入口

此页仅使用 GitHub Pages 的静态文件，在浏览器中调用与主站相同的算法。无需登录、安装或手动下载，不写入起卦历史、localStorage、sessionStorage、IndexedDB 或服务器数据库。

这不是返回动态 JSON 的 HTTP 服务。普通 HTTP 抓取只能取得 HTML；Agent 需要支持执行 JavaScript 的浏览器。页面以 JSON 文本显示结果，也提供直接返回对象的浏览器函数。

## 带参数打开

将示例路径接在站点地址后，例如 `https://wjsgzz.github.io/PBlossom/compute.html`。

```text
compute.html?type=meihua&numbers=1,2,3&date=2026-10-25&time=14:30&timezone=Asia/Shanghai
compute.html?type=calendar&date=2026-10-25&time=14:30&timezone=Asia/Shanghai
compute.html?type=liuren&date=2026-10-25&time=14:30&timezone=Asia/Shanghai&longitude=120.86
```

| 参数 | 说明 |
| --- | --- |
| `type` | `meihua`、`liuren`、`calendar`；默认 `calendar` |
| `date` | `YYYY-MM-DD`，在 timezone 指定的时区中解释；省略时取该时区当天日期 |
| `time` | `HH:mm` 或 `HH:mm:ss`；梅花、六壬指定 date 时须同时提供 time；万年历只传 date 时用当地正午 12:00:00 |
| `timezone` | IANA 时区，例如 `Asia/Shanghai`、`America/Los_Angeles`；也接受固定偏移 `UTC+08:00`。省略时使用浏览器时区 |
| `datetime` | 带偏移的完整时间，例如 `2026-10-25T14:30:00+08:00` 或 `2026-10-25T06:30:00Z`；与 date/time 二选一。推荐 AI 使用 |
| `numbers` | 梅花需要，三个正的安全整数，以英文逗号分隔；按原算法取余起卦 |
| `question` | 梅花或六壬的可选备注，最多 2000 字符；不对文字作自动起卦或解读 |
| `longitude` | 六壬可选，经度 -180 至 180，东经为正；提供时启用真太阳时校正，不调用设备定位 |
| `monthGeneral` | 六壬可选，指定月将，一个地支 |
| `hourBranch` | 六壬可选，指定占时，一个地支 |
| `nobleMode` | 六壬可选，指定贵人：`day` 昼贵，`night` 夜贵；省略时自动选择 |

不传 `date`、`time`、`datetime` 时，每次调用使用浏览器设备的当前时刻。浏览器时区通过系统设置取得，不使用定位权限。Agent 的浏览器时区可能不同于用户，应优先传入明确的 `datetime`，或传 `date`、`time`、`timezone`。

示例：洛杉矶的 `2026-10-24 23:30`（`timezone=America/Los_Angeles`）与北京时间 `2026-10-25 14:30` 是同一时刻，计算结果一致。`datetime=2026-10-25T14:30:00%2B08:00` 也表示这个时刻；URL 中的正号必须编码为 `%2B`，可用 URLSearchParams 自动处理。

时区用于确定真实时刻，算法继续以**北京时间固定 UTC+8**为基准计算农历、干支与节气；不会把美国钟面时间当成北京时间。JSON 的 `input.date/time/timezone` 保留用户时间语境，`input.instant` 给出 UTC 时间，`input.calculation` 给出算法采用的北京时间。`data` 中日期和干支均属于这一计算基准，不代表美国当地日期的单独历法规则。IANA 时区遵循历史夏令时，固定 UTC+8 则不采用夏令时。

夏令时跳过的钟面时间返回错误；回拨时重复出现的钟面时间也返回错误，须使用带明确偏移的 `datetime` 选择是哪一次。`datetime` 本身已带偏移；若同时提供 timezone，后者只控制 `input` 的时间显示语境。

换算后的北京时间支持范围为 1900-01-01 00:00:00 至 2100-12-31 22:59:59；23 点日柱按次日计。六壬启用经度校正时，日期限制为 1900-01-02 至 2100-12-29，为跨日校正留出数据边界。

备注或中文参数请用 URLSearchParams 编码。只有对应计算类型会使用的参数才有作用；未知参数名返回错误。

## Agent 读取方式

1. 用浏览器打开带参数链接。
2. 等待 `html[data-state="ready"]` 或 `html[data-state="error"]` 出现，二者都表示计算已结束。
3. 页面只呈现 JSON。读取 `#result` 的文本并解析 JSON；若可执行浏览器 JavaScript，直接读取 `window.pblossomResult`。

成功结果为 `{ ok: true, type, input, data }`。失败结果为 `{ ok: false, type, error: { code, message } }`。参数错误是页面内的 JSON 状态，不是 HTTP 400。`input` 包含输入时区、实际 UTC 时刻及 `calculation` 中的计算基准。

`data` 只保留排盘结果，不返回界面样式、干支拆字、五行常识说明或重复报告：

- 梅花：`四柱`、`本卦`、`互卦`、`变卦`、`动爻`、`体卦`、`用卦`。
- 六壬：`四柱`、`农历`、`月将`、`占时`、`贵人`、`旬`、`空亡`、`天地盘`、`天将`、`四课`、`三传`、`课体`；启用经度校正时另有 `真太阳时`。天地盘与天将均以地盘地支为键，四课按一至四课排列，三传按初、中、末传排列。
- 万年历：`农历`、`四柱`、`节气`（`前`、`后`）。

例如梅花的 `data`：

```json
{"四柱":"丙午 戊戌 壬申 丁未","本卦":"天泽履","互卦":"风火家人","变卦":"乾为天","动爻":3,"体卦":"乾","用卦":"兑"}
```

## 同一页面连续计算

Agent 不必每次重新打开页面。等待入口加载后，在浏览器执行：

```javascript
window.PBlossomCompute.calculate({
  type: 'meihua', numbers: [1, 2, 3],
  datetime: '2026-10-25T14:30:00+08:00', question: '示例备注'
})
```

函数同步返回普通结果对象，不保存、不改变页面。`PBlossomCompute.run(params)` 另外会把结果显示在页面、更新 `window.pblossomResult` 和 `data-state`，并发出 `pblossom:result` 事件。每次调用都重新计算；不会复用上次的输入或把结果写入主站历史。

本页的“不保存”指应用不持久化输入和结果；不控制浏览器自身对访问网址的历史记录。
