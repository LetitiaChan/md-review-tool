/**
 * mock-vscode.js - VS Code API Mock 层
 * 在测试容器中模拟 acquireVsCodeApi()，使生产 JS 可以脱离 VS Code 运行
 * 必须在所有生产 JS 之前加载
 */
(() => {
    // 内存状态存储
    let _state = {};

    // 消息日志（供测试断言使用）
    const _messageLog = [];

    // 自定义响应注册表
    const _customResponses = {};

    // 消息监听器（供测试用例监听 postMessage 调用）
    const _messageListeners = [];

    // Mock vscode API 对象
    const mockVscodeApi = {
        postMessage(message) {
            _messageLog.push(message);

            // 通知所有监听器
            _messageListeners.forEach(listener => {
                try { listener(message); } catch (e) { console.warn('[mock-vscode] listener error:', e); }
            });

            // 根据消息类型返回预设响应
            const { type, requestId } = message;

            // 检查自定义响应
            if (_customResponses[type]) {
                const response = typeof _customResponses[type] === 'function'
                    ? _customResponses[type](message)
                    : _customResponses[type];
                _dispatchResponse(type, response, requestId);
                return;
            }

            // 默认响应
            switch (type) {
                case 'ready':
                    // 不需要响应
                    break;
                case 'getFiles':
                    _dispatchResponse('fileList', { files: [] }, requestId);
                    break;
                case 'getState':
                    _dispatchResponse('stateValue', { value: null }, requestId);
                    break;
                case 'setState':
                    // 静默处理
                    break;
                case 'resolveImageUris':
                    _dispatchResponse('imageUris', {}, requestId);
                    break;
                case 'resolveAnnotationImageUris':
                    _dispatchResponse('annotationImageUris', {}, requestId);
                    break;
                case 'saveAnnotations':
                    // 静默处理
                    break;
                case 'saveFile':
                    _dispatchResponse('fileSaved', { success: true }, requestId);
                    break;
                default:
                    console.log('[mock-vscode] unhandled message type:', type);
            }
        },

        getState() {
            return _state;
        },

        setState(newState) {
            _state = newState;
            return newState;
        }
    };

    // 分发响应消息（模拟 Extension Host → Webview 的消息）
    function _dispatchResponse(type, payload, requestId) {
        setTimeout(() => {
            const event = new MessageEvent('message', {
                data: { type, payload, requestId }
            });
            window.dispatchEvent(event);
        }, 10);
    }

    // 模拟 acquireVsCodeApi
    window.acquireVsCodeApi = function() {
        return mockVscodeApi;
    };

    // 暴露测试接口
    window.__mockVscode = {
        // 获取消息日志
        getMessageLog() {
            return [..._messageLog];
        },

        // 清空消息日志
        clearMessageLog() {
            _messageLog.length = 0;
        },

        // 注册自定义响应（可以是对象或函数）
        setResponse(type, response) {
            _customResponses[type] = response;
        },

        // 移除自定义响应
        removeResponse(type) {
            delete _customResponses[type];
        },

        // 清空所有自定义响应
        clearResponses() {
            Object.keys(_customResponses).forEach(k => delete _customResponses[k]);
        },

        // 添加消息监听器
        addMessageListener(listener) {
            _messageListeners.push(listener);
        },

        // 移除消息监听器
        removeMessageListener(listener) {
            const idx = _messageListeners.indexOf(listener);
            if (idx >= 0) _messageListeners.splice(idx, 1);
        },

        // 模拟 Extension Host 发送消息给 Webview
        sendToWebview(message) {
            const event = new MessageEvent('message', { data: message });
            window.dispatchEvent(event);
        },

        // 重置所有状态
        reset() {
            _state = {};
            _messageLog.length = 0;
            Object.keys(_customResponses).forEach(k => delete _customResponses[k]);
            _messageListeners.length = 0;
        },

        // 获取/设置内部状态
        getState() { return _state; },
        setState(s) { _state = s; }
    };
})();
