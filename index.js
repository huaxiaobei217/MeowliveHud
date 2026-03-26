import { getContext } from "../../../extensions.js";
import { eventSource, event_types } from "../../../../script.js";

const extensionName = "MeowLiveHUD";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

let templateHtml = "";

jQuery(async () => {
    // 1. 读取你的完整模板代码
    const response = await fetch(`${extensionFolderPath}/template.html`);
    templateHtml = await response.text();
    
    // 清除开头和结尾可能多余的 markdown 符号
    templateHtml = templateHtml.replace(/^```html\s*/, '').replace(/```\s*$/, '');

    // 2. 加载小球样式
    $("head").append(`<link rel="stylesheet" href="${extensionFolderPath}/style.css">`);

    // 3. 在页面生成小球和画中画(iframe)
    $("body").append(`
        <div id="meow-float-btn" title="开关猫猫面板">🐱</div>
        <div id="meow-hud-wrapper">
            <iframe id="meow-hud-iframe"></iframe>
        </div>
    `);

    // 4. 点击小球开关面板
    $("#meow-float-btn").on("click", () => {
        $("#meow-hud-wrapper").toggleClass("show");
    });

    // 5. 监听 AI 发来的新消息
    eventSource.on(event_types.MESSAGE_RECEIVED, processMessage);
    eventSource.on(event_types.MESSAGE_UPDATED, processMessage);
});

function processMessage(messageId) {
    const context = getContext();
    const chat = context.chat;
    const msg = chat.find(m => m._id === messageId || m.mesId === messageId) || chat[chat.length - 1];

    if (!msg || msg.is_user) return;

    // 抓取 [CAT_HUD_START] 和 [CAT_HUD_END] 之间的内容
    const regex = /\[CAT_HUD_START\]([\s\S]*?)\[CAT_HUD_END\]/s;
    const match = msg.mes.match(regex);

    if (match) {
        const rawData = match[1];

        // A. 把这堆乱码从酒馆聊天记录里删掉，保持界面干净！
        msg.mes = msg.mes.replace(regex, '').trim();
        $(`[mesid="${messageId}"] .mes_text`).html(msg.mes);

        // B. 替换模板里的 $1 为抓取到的数据
        const finalHtml = templateHtml.replace('$1', rawData);

        // C. 把这 3000 行代码+数据塞进画中画里运行
        const iframe = document.getElementById("meow-hud-iframe");
        iframe.srcdoc = finalHtml;
        
        // D. 有新数据时自动弹出面板
        $("#meow-hud-wrapper").addClass("show");
    }
}
