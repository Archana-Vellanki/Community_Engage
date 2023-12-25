//Setting alarm to 1 minute
chrome.alarms.create("1min", {
  delayInMinutes: 1,
  periodInMinutes: 1,
});

//listens to the unread messages on alarm
chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === "1min") {
    chrome.storage.local.get(["useremail", "currentToken"], function (result) {
      if (result.currentToken != "" && result.currentToken != undefined) {
        let xml = new XMLHttpRequest();
        xml.open(
          "GET",
          "http://127.0.0.1:5000/api/checkUnread?email=" +
            encodeURIComponent(result.useremail)
        );
        xml.send();
        xml.onload = function () {
          unreadCount = JSON.parse(xml.response);
          if (xml.status === 200) {
            chrome.notifications.create(
              "name-for-notification",
              {
                type: "basic",
                iconUrl: "logo.png",
                title: "New messages from Community Engage",
                message: "" + unreadCount + " unread messages",
              },
              function () {}
            );
            chrome.browserAction.setBadgeBackgroundColor({
              color: "red",
            });
            chrome.browserAction.setBadgeText({ text: unreadCount + "" });
            chrome.storage.local.set(
              { unreadCount: unreadCount },
              function () {}
            );
          }
        };
      }
    });
  }
});
