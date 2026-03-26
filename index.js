import { getContext } from "../../../extensions.js";
import { eventSource, event_types } from "../../../../script.js";

const extensionName = "MeowLiveHUD";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

let templateHtml = "";

jQuery(async () => {
    // 1. 读取你的模板 HTML 代码
    try {
        const response = await fetch(`${extensionFolderPath}/template.html`);
        templateHtml = await response.text();
    } catch (e) {
        console.error("[MeowLiveHUD] 模板加载失败，请检查 template.html 是否存在:", e);
        return;
    }

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

    // 5. 监听 AI 发来的新消息（使用 MESSAGE_RECEIVED 和 CHARACTER_MESSAGE_RENDERED 双重保险）
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, processMessage);
    eventSource.on(event_types.MESSAGE_RECEIVED, processMessage);
});

function processMessage(messageId) {
    const context = getContext();
    const chat = context.chat;
    // 兼容不同版本的事件传参
    const id = typeof messageId === 'object' ? messageId.messageId : messageId;
    const msg = chat.find(m => m._id === id || m.mesId === id) || chat[chat.length - 1];

    if (!msg || msg.is_user) return;

    // 抓取 [CAT_HUD_START] 和 [CAT_HUD_END] 之间的内容
    const regex = /\[CAT_HUD_START\]([\s\S]*?)\[CAT_HUD_END\]/s;
    const match = msg.mes.match(regex);

    if (match) {
        const rawData = match[1];

        // A. 把这堆乱码从酒馆聊天记录里彻底删掉，保持界面干净！
        const cleanMes = msg.mes.replace(regex, '').trim();
        msg.mes = cleanMes; 
        
        // 查找当前消息的 HTML 元素并替换文本，防止乱码闪烁
        const messageElement = $(`[mesid="${id}"] .mes_text`);
        if (messageElement.length > 0) {
            messageElement.html(cleanMes);
        }

        // B. 替换模板里的 $1 为抓取到的数据（使用 split.join 防止正则冲突）
        const finalHtml = templateHtml.split('$1').join(rawData);

        // C. 把代码+数据塞进画中画里运行
        const iframe = document.getElementById("meow-hud-iframe");
        if (iframe) {
            iframe.srcdoc = finalHtml;
        }
        
        // D. 有新数据时自动弹出面板
        $("#meow-hud-wrapper").addClass("show");
    }
}
