window.HUB_EVENTS = {
  ASSET_ADDED: "ASSET_ADDED",
  ASSET_DELETED: "ASSET_DELETED",
  ASSET_DESELECTED: "ASSET_DESELECTED",
  ASSET_SELECTED: "ASSET_SELECTED",
  ASSET_UPDATED: "ASSET_UPDATED",
  CONSOLE_CHANGE: "CONSOLE_CHANGE",
  CONSOLE_CLOSED: "CONSOLE_CLOSED",
  CONSOLE_EVENT: "CONSOLE_EVENT",
  CONSOLE_OPENED: "CONSOLE_OPENED",
  CONSOLE_RUN_COMMAND: "CONSOLE_RUN_COMMAND",
  CONSOLE_SERVER_CHANGE: "CONSOLE_SERVER_CHANGE",
  EMBED_ACTIVE_PEN_CHANGE: "EMBED_ACTIVE_PEN_CHANGE",
  EMBED_ACTIVE_THEME_CHANGE: "EMBED_ACTIVE_THEME_CHANGE",
  EMBED_ATTRIBUTE_CHANGE: "EMBED_ATTRIBUTE_CHANGE",
  EMBED_RESHOWN: "EMBED_RESHOWN",
  FORMAT_FINISH: "FORMAT_FINISH",
  FORMAT_ERROR: "FORMAT_ERROR",
  FORMAT_START: "FORMAT_START",
  IFRAME_PREVIEW_RELOAD_CSS: "IFRAME_PREVIEW_RELOAD_CSS",
  IFRAME_PREVIEW_URL_CHANGE: "IFRAME_PREVIEW_URL_CHANGE",
  KEY_PRESS: "KEY_PRESS",
  LINTER_FINISH: "LINTER_FINISH",
  LINTER_START: "LINTER_START",
  PEN_CHANGE_SERVER: "PEN_CHANGE_SERVER",
  PEN_CHANGE: "PEN_CHANGE",
  PEN_EDITOR_CLOSE: "PEN_EDITOR_CLOSE",
  PEN_EDITOR_CODE_FOLD: "PEN_EDITOR_CODE_FOLD",
  PEN_EDITOR_ERRORS: "PEN_EDITOR_ERRORS",
  PEN_EDITOR_EXPAND: "PEN_EDITOR_EXPAND",
  PEN_EDITOR_FOLD_ALL: "PEN_EDITOR_FOLD_ALL",
  PEN_EDITOR_LOADED: "PEN_EDITOR_LOADED",
  PEN_EDITOR_REFRESH_REQUEST: "PEN_EDITOR_REFRESH_REQUEST",
  PEN_EDITOR_RESET_SIZES: "PEN_EDITOR_RESET_SIZES",
  PEN_EDITOR_SIZES_CHANGE: "PEN_EDITOR_SIZES_CHANGE",
  PEN_EDITOR_UI_CHANGE_SERVER: "PEN_EDITOR_UI_CHANGE_SERVER",
  PEN_EDITOR_UI_CHANGE: "PEN_EDITOR_UI_CHANGE",
  PEN_EDITOR_UI_DISABLE: "PEN_EDITOR_UI_DISABLE",
  PEN_EDITOR_UI_ENABLE: "PEN_EDITOR_UI_ENABLE",
  PEN_EDITOR_UNFOLD_ALL: "PEN_EDITOR_UNFOLD_ALL",
  PEN_ERROR_INFINITE_LOOP: "PEN_ERROR_INFINITE_LOOP",
  PEN_ERROR_RUNTIME: "PEN_ERROR_RUNTIME",
  PEN_ERRORS: "PEN_ERRORS",
  PEN_LIVE_CHANGE: "PEN_LIVE_CHANGE",
  PEN_LOGS: "PEN_LOGS",
  PEN_MANIFEST_CHANGE: "PEN_MANIFEST_CHANGE",
  PEN_MANIFEST_FULL: "PEN_MANIFEST_FULL",
  PEN_PREVIEW_FINISH: "PEN_PREVIEW_FINISH",
  PEN_PREVIEW_START: "PEN_PREVIEW_START",
  PEN_SAVED: "PEN_SAVED",
  POPUP_CLOSE: "POPUP_CLOSE",
  POPUP_OPEN: "POPUP_OPEN",
  POST_CHANGE: "POST_CHANGE",
  POST_SAVED: "POST_SAVED",
  PROCESSING_FINISH: "PROCESSING_FINISH",
  PROCESSING_START: "PROCESSED_STARTED"
}, "object" != typeof window.CP && (window.CP = {}), window.CP.PenTimer = {
  programNoLongerBeingMonitored: !1,
  timeOfFirstCallToShouldStopLoop: 0,
  _loopExits: {},
  _loopTimers: {},
  START_MONITORING_AFTER: 2e3,
  STOP_ALL_MONITORING_TIMEOUT: 5e3,
  MAX_TIME_IN_LOOP_WO_EXIT: 2200,
  // Função para registrar que o loop identificado por "E" foi encerrado.
exitedLoop: function (E) {
    this._loopExits[E] = true; // Armazena o estado de saída do loop.
},

// Função para verificar se o loop deve ser interrompido, com base no tempo.
shouldStopLoop: function (E) {
    // Verifica se o programa foi marcado para interrupção e, se sim, retorna true.
    if (this.programKilledSoStopMonitoring) return true;

    // Verifica se o programa já não está mais sendo monitorado e, se sim, permite a continuidade.
    if (this.programNoLongerBeingMonitored) return false;

    // Verifica se o loop já foi registrado como encerrado e, se sim, permite a continuidade.
    if (this._loopExits[E]) return false;

    // Obtém o tempo atual.
    var currentTime = this._getTime();

    // Define o tempo de início da verificação do loop, se ainda não estiver definido.
    if (this.timeOfFirstCallToShouldStopLoop === 0) {
        this.timeOfFirstCallToShouldStopLoop = currentTime;
        return false;
    }

    // Calcula o tempo decorrido desde o início da verificação.
    var elapsedTime = currentTime - this.timeOfFirstCallToShouldStopLoop;

    // Permite a continuidade do loop se o tempo de monitoramento ainda não iniciou.
    if (elapsedTime < this.START_MONITORING_AFTER) return false;

    // Para de monitorar o programa se o tempo limite de monitoramento for excedido.
    if (elapsedTime > this.STOP_ALL_MONITORING_TIMEOUT) {
        this.programNoLongerBeingMonitored = true;
        return false;
    }

    // Verifica se há um loop infinito; caso ocorra um erro, envia uma mensagem ao editor e interrompe o monitoramento.
    try {
        this._checkOnInfiniteLoop(E, currentTime);
    } catch (error) {
        this._sendErrorMessageToEditor();
        this.programKilledSoStopMonitoring = true;
        return true;
    }

    // Caso nenhuma condição de parada seja atendida, o loop continua.
    return false;
},

// Função para enviar uma mensagem de erro ao editor quando um loop infinito é detectado.
_sendErrorMessageToEditor: function () {
    try {
        // Verifica se deve enviar a mensagem e então envia informações sobre o erro.
        if (this._shouldPostMessage()) {
            var errorMessage = {
                topic: HUB_EVENTS.PEN_ERROR_INFINITE_LOOP,
                data: {
                    line: this._findAroundLineNumber()
                }
            };
            parent.postMessage(errorMessage, "*");
        } else {
            this._throwAnErrorToStopPen();
        }
    } catch (_) {
        this._throwAnErrorToStopPen(); // Lança uma exceção se a mensagem falhar.
    }
},

// Função para verificar se deve enviar a mensagem de erro ao editor.
_shouldPostMessage: function () {
    // Verifica a URL para garantir que a mensagem de erro seja postada apenas em certas condições.
    return document.location.href.match(/boomboom/);
},

// Função para lançar uma exceção e parar o código quando um loop infinito é detectado.
_throwAnErrorToStopPen: function () {
    throw "We found an infinite loop in your Pen. We've stopped the Pen from running. More details and workarounds at https://blog.codepen.io/2016/06/08/can-adjust-infinite-loop-protection-timing/";
},

// Função para identificar o número da linha onde ocorreu o erro de loop.
_findAroundLineNumber: function () {
    var error = new Error,
        lineNumber = 0;
    if (error.stack) {
        var match = error.stack.match(/boomboom\S+:(\d+):\d+/);
        if (match) lineNumber = match[1];
    }
    return lineNumber;
},

// Função para verificar o tempo decorrido em um loop e detectar loops infinitos.
_checkOnInfiniteLoop: function (E, currentTime) {
    // Se o loop ainda não tiver um temporizador, inicia um com o tempo atual.
    if (!this._loopTimers[E]) {
        this._loopTimers[E] = currentTime;
        return false;
    }

    // Calcula o tempo decorrido e lança uma exceção se exceder o limite permitido.
    var elapsed;
    if (currentTime - this._loopTimers[E] > this.MAX_TIME_IN_LOOP_WO_EXIT) {
        throw "Infinite Loop found on loop: " + E;
    }
},

// Função para obter o tempo atual em milissegundos.
_getTime: function () {
    return +new Date();
}

// Função global para verificar se a execução deve ser interrompida.
window.CP.shouldStopExecution = function (E) {
    var shouldStop = window.CP.PenTimer.shouldStopLoop(E);
    if (shouldStop === true) {
        console.warn("[CodePen]: An infinite loop (or a loop taking too long) was detected, so we stopped its execution. More details at https://blog.codepen.io/2016/06/08/can-adjust-infinite-loop-protection-timing/");
    }
    return shouldStop;
};

// Função global para registrar que o loop foi encerrado.
window.CP.exitedLoop = function (E) {
    window.CP.PenTimer.exitedLoop(E);
};
