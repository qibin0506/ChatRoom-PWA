var baseUrl = "https://codercard.net:8890/";
var dataUrl = baseUrl + "user";
var isSubscibed;
var swRegistration;
var userName;

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js")
        .then(function() {
            console.log("serviceWorker register success");
        }).catch(function(err) {
            console.log(err.message);
        });

    if ("PushManager" in window) {
        navigator.serviceWorker.ready.then(function(swReg) {
            console.log("PushManager registration success");
            swRegistration = swReg;
            initPush();
        }).catch(function(err) {
            console.log(err.message);
        });

        navigator.serviceWorker.addEventListener("message", function(e) {
            showMessage(e.data);
        });
    } else {
        console.log("your browser do not support PushManager.");
    }

    // navigator.serviceWorker.controller.postMessage("hello world");
} else {
    console.log("your browser do not support serviceWorker.");
}

function initPush() {
    swRegistration.pushManager.getSubscription()
        .then(function(subscription) {
            if (subscription) {
                isSubscibed = true;
                updateSubscriptionOnServer(subscription);
            } else {
                subscribe();
            }
        }).catch(function(err) {
            console.log(err.message);
        });
}

function subscribe() {
    swRegistration.pushManager.subscribe({
        userVisibleOnly: true
    }).then(function(subscription) {
        isSubscibed = true;
        updateSubscriptionOnServer(subscription);
    }).catch(function(err) {
        console.log(err.message);
    });
}

function updateSubscriptionOnServer(subscription) {
    if (subscription) {
        getUserInfo(subscription);
    }
}

function startPing(subscription) {
    setInterval(function() {
        var request = new XMLHttpRequest();
        request.open("POST", "/ping", true);
        request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        request.send("sub=" + JSON.stringify(subscription));
        console.log("ping...");
    }, 5 * 60 * 1000);
}

function getUserInfo(subscription) {
    userInfo(subscription, function(resp) {
        if (resp == null) {
            showRegister(subscription);
            return;
        }
        document.getElementById('pop').style.display = "none";
        userName = resp.name;

        startPing(subscription);
    });
}

function userInfo(subscription, f) {
    if ("caches" in window) {
        caches.match(dataUrl).then(function(response) {
            if (response) {
                response.json().then(function(json) {
                    f(json);
                }).catch(function(err) {
                    console.log(err.message);
                });
            }
        });
    }

    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if (request.readyState == XMLHttpRequest.DONE) {
            if (request.status == 200) {
                var resp = request.response;
                if (resp) {
                    f(JSON.parse(request.response));
                    return;
                }
                f(null);
            }
        }
    };

    request.open("POST", "/user", true);
    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    request.send("sub=" + JSON.stringify(subscription));
}

function showRegister(subscription) {
    var pop = document.getElementById('pop');
    var confirm = document.getElementById("login-confirm");
    var loading = document.getElementById("login-loading");

    pop.style.display='block';

    confirm.addEventListener("click", function(e) {
        var name = document.getElementById("user-name").value;
        if (name == null || name == "") { return}

        confirm.style.display = "none";
        loading.style.display = "block";

        register(subscription, name, function(resp) {
            if (resp == null) {
                confirm.style.display = "block";
                loading.style.display = "none";
                alert("注册失败，请重试");
                return;
            }
            pop.style.display='none';

            userName = resp.name;
            startPing(subscription);
        });
    });
}

function register(subscription, name, f) {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if (request.readyState == XMLHttpRequest.DONE) {
            if (request.status == 200) {
                var resp = request.response;
                if (resp) {
                    f(JSON.parse(request.response));
                    return;
                }
                f(null);
            }
        }
    };

    request.open("POST", "/reg", true);
    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    request.send("sub=" + JSON.stringify(subscription) + "&name=" + name);
}

function send() {
    var content = document.getElementById("chat-message-input").value;
    if (content == null || content == "") { return;}
    sendMessage(content);
    return false;
}

function sendMessage(message) {
    if (userName == null) { return;}

    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if (request.readyState == XMLHttpRequest.DONE) {
            if (request.status == 200) {
                document.getElementById("chat-message-input").value = "";
            }
        }
    };

    request.open("POST", "/send", true);
    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    request.send("name=" + userName + "&msg=" + message);
}

function showMessage(message) {
    var messageContainer = document.getElementById("message-list-container");
    var messageList = document.getElementById("message-list");
    messageList.innerHTML += "<li class=\"mdl-list__item mdl-list__item--three-line\"><span class=\"mdl-list__item-primary-content\"><i class=\"material-icons mdl-list__item-avatar\">person</i><span>"+message.name+"</span><span class=\"mdl-list__item-text-body\">"+message.body+"</span></span></li>";
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

// *******判断用户是否正在浏览当前网页标签******

var hidden, state, visibilityChange;
if (typeof document.hidden !== "undefined") {
    hidden = "hidden";
    visibilityChange = "visibilitychange";
    state = "visibilityState";
} else if (typeof document.mozHidden !== "undefined") {
    hidden = "mozHidden";
    visibilityChange = "mozvisibilitychange";
    state = "mozVisibilityState";
} else if (typeof document.msHidden !== "undefined") {
    hidden = "msHidden";
    visibilityChange = "msvisibilitychange";
    state = "msVisibilityState";
} else if (typeof document.webkitHidden !== "undefined") {
    hidden = "webkitHidden";
    visibilityChange = "webkitvisibilitychange";
    state = "webkitVisibilityState";
}

document.addEventListener(visibilityChange, function() {
    navigator.serviceWorker.controller.postMessage(document[state]);
}, false);