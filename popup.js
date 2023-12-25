document.addEventListener("DOMContentLoaded", displayExtension);

// checks the token value in local storage and opens the extension page depending on that
// login if no token and home if token present
function displayExtension() {
  let ct = "";
  let cn = "";
  chrome.storage.local.get(["currentToken", "username"], function (result) {
    ct = result.currentToken;
    cn = result.username;
    if (ct != "" && ct != undefined) {
      displayHome();
    } else {
      document.getElementById("content").innerHTML =
        '<blockquote class="blockquote text-center">\
          <p style="font-weight:bold" class="mb-0">MSIT COMMUNITY ENGAGEMENT</p>\
          <footer class="blockquote-footer"><ul class="list-group list-group-flush">\
          <li class="list-group-item">Faster completion of tasks</li>\
          <li class="list-group-item">Easy sharing of resources</li>\
          <li class="list-group-item">Data Transparency</li>\
          <li class="list-group-item">Complete personalization</li>\
          <li class="list-group-item">Ensuring privacy</li>\
        </ul></footer>\
        </blockquote>\
        <div class="text-center"><button type="button" id="login" class="btn btn-primary">Sign in with MSIT account</button></div>\
        <div id="loginerror"></div>';
      document.getElementById("login").addEventListener("click", loginFunc);
    }
  });
}

//displays the home and contains the enable and disable switch
function displayHome() {
  chrome.storage.local.get(
    ["switch", "isDataSaved", "taskname", "unreadCount"],
    function (result) {
      if (result.switch || result.taskname === undefined) {
        document.getElementById("content").innerHTML =
          '<div class="custom-control custom-switch" style="margin: 25px 0px 20px">\
        <input type="checkbox" checked class="custom-control-input" id="switch">\
        <label class="custom-control-label" id="labelSwitch" for="switch">Checked-in</label><div id="enable" class="alert alert-warning" role="alert" style="display:inline; margin:25px">\
        Tasks data being monitored</div></div>';
      } else {
        document.getElementById("content").innerHTML =
          '<div class="custom-control custom-switch" style="margin:25px 0px 20px"><input type="checkbox" class="custom-control-input" id="switch"><label class="custom-control-label" id="labelSwitch" for="switch">Checked-out</label><div id="enable" class="alert alert-warning" role="alert" style="display:inline; margin:25px">\
        Data not being monitored</div></div>';
      }
      if (result.unreadCount > 0) {
        document.getElementById("notifbadge").style.visibility = "visible";
        document
          .getElementById("notifbadge")
          .setAttribute("data-count", "" + result.unreadCount);
      }
      tasksFunc();
    }
  );
}

// authorization and checks if valid user or not
//stores the token, name ,email in local storage for further use if valid user
// error if not and home if valid user
function loginFunc() {
  console.log("Logging in");
  document.getElementById("loginerror").innerHTML = "";
  let currentName = "";
  let currentEmail = "";
  chrome.identity.getAuthToken(
    {
      interactive: true,
    },
    function (token) {
      if (chrome.runtime.lastError) {
        alert(chrome.runtime.lastError.message);
        return;
      }
      chrome.storage.local.set({ currentToken: token }, function () {});
      let x = new XMLHttpRequest();
      x.open(
        "GET",
        "https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=" +
          token
      );
      x.onload = function () {
        user_data = JSON.parse(x.response);
        currentEmail = user_data["email"];
        if (user_data["given_name"].split(" ").length > 1) {
          currentName = user_data["given_name"].split(" ")[0];
        } else {
          currentName = user_data["given_name"];
        }
        chrome.storage.local.set(
          { username: currentName, useremail: currentEmail },
          function () {}
        );

        let xhr = new XMLHttpRequest();
        xhr.open(
          "GET",
          "http://127.0.0.1:5000/api/auth?email=" +
            encodeURIComponent(currentEmail)
        );
        xhr.send();
        xhr.onload = function () {
          respns = JSON.parse(xhr.response);
          if (xhr.status === 200) {
            displayHome();
            chrome.storage.local.get(
              ["taskname", "startTime", "switch"],
              function (result) {
                if (result.taskname != undefined) {
                  chrome.storage.local.set(
                    { startTime: Date.now(), isDataSaved: false },
                    function () {}
                  );
                }
                if (result.switch === undefined) {
                  chrome.storage.local.set({ switch: true }, function () {});
                }
              }
            );
          } else {
            document.getElementById("loginerror").innerHTML +=
              '<div class="alert alert-danger" role="alert">' +
              respns["error"] +
              "</div>";
            document
              .getElementById("login")
              .addEventListener("click", loginFunc);
            let url =
              "https://accounts.google.com/o/oauth2/revoke?token=" +
              currentToken;
            window.fetch(url);

            chrome.storage.local.get(["currentToken"], function (result) {
              let ct = result.currentToken;
              chrome.identity.removeCachedAuthToken(
                { token: ct },
                function () {}
              );
            });
            chrome.storage.local.set(
              { currentToken: "", username: "", useremail: "" },
              function () {}
            );
          }
        };
      };
      x.send();
    }
  );
}

// logsout the user and removes the local storage values
function logoutFunc() {
  console.log("logging out");
  chrome.storage.local.get(["currentToken", "isDataSaved"], function (result) {
    if (!result.isDataSaved) {
      alert("Save the work before logging out");
    } else {
      let ct = result.currentToken;
      let url = "https://accounts.google.com/o/oauth2/revoke?token=" + ct;
      window.fetch(url);

      chrome.identity.removeCachedAuthToken({ token: ct }, function () {
        document.getElementById("content").innerHTML =
          '<blockquote class="blockquote text-center">\
          <p style="font-weight:bold" class="mb-0">MSIT COMMUNITY ENGAGEMENT</p>\
          <footer class="blockquote-footer"><ul class="list-group list-group-flush">\
          <li class="list-group-item">Faster completion of tasks</li>\
          <li class="list-group-item">Easy sharing of resources</li>\
          <li class="list-group-item">Data Transparency</li>\
          <li class="list-group-item">Complete personalization</li>\
          <li class="list-group-item">Ensuring privacy</li>\
        </ul></footer>\
        </blockquote>\
        <div class="text-center"><button type="button" id="login" class="btn btn-primary">Sign in with MSIT account</button></div>\
        <div id="loginerror"></div>';
        document.getElementById("message").style.visibility = "hidden";
        document.getElementById("notification").style.visibility = "hidden";
        document.getElementById("urdata").style.visibility = "hidden";
        document.getElementById("logout").style.visibility = "hidden";
        document.getElementById("notifbadge").style.visibility = "hidden";
        document.getElementById("login").addEventListener("click", loginFunc);
      });
      chrome.storage.local.set(
        { currentToken: "", username: "", useremail: "" },
        function () {}
      );
    }
  });
}

//Allows the user to check in and check out while working and
//also makes sure that the data is saved
function switchEvent() {
  console.log("Checking in/out");
  chrome.storage.local.get(["switch", "isDataSaved"], function (result) {
    let st;
    if (result.switch == false) {
      st = Date.now();
    } else {
      st = result.startTime;
    }
    if (document.getElementById("switch").checked) {
      chrome.storage.local.set({ startTime: st, switch: true }, function () {
        document.getElementById("labelSwitch").innerHTML = "Checked-in";
        document.getElementById("enable").innerHTML =
          "Tasks data being monitered";
      });
    } else {
      if (result.isDataSaved) {
        chrome.storage.local.set(
          { switch: false, startTime: null },
          function () {}
        );
        document.getElementById("labelSwitch").innerHTML = "Checked-out";
        document.getElementById("enable").innerHTML =
          "Data not being monitered";
      } else {
        alert("please save the data before disabling");
        document.getElementById("switch").checked = true;
      }
    }
  });
}

// displays the tasks to be worked on
// provides suggestions (urls) for the tasks
function tasksFunc() {
  chrome.storage.local.get(
    ["username", "useremail", "taskname", "startTime", "isDataSaved", "switch"],
    function (result) {
      let cn = result.username;
      let ce = result.useremail;
      let ct = result.taskname;
      if (ct === undefined) {
        ct = "";
      }
      let taskxml = new XMLHttpRequest();
      taskxml.open(
        "GET",
        "http://127.0.0.1:5000/api/tasks?email=" + encodeURIComponent(ce)
      );
      taskxml.send();
      taskxml.onload = function () {
        let content =
          '<div><label for="taskSelect" style="display:inline">' +
          cn +
          ' work on: </label><select id = "taskSelect" name = "taskSelect" class="custom-select" style="width:60%" required><option id="selectedTask" selected hidden>' +
          ct +
          "</option>";
        if (taskxml.status === 200) {
          let tasksList = JSON.parse(taskxml.response)["tasks"];
          tasksList.forEach((eachTask) => {
            content +=
              "<option value=" + eachTask + ">" + eachTask + "</option>";
          });
        } else {
          let res = JSON.parse(taskxml.response);
          content +=
            "<option value=" +
            res["error"] +
            " disabled>" +
            res["error"] +
            "</option>";
        }
        content +=
          '</select></div><br><div class="nav nav-tabs" id="nav-tab" role="tablist">\
          <a class="nav-item nav-link" id="suggestions" data-toggle="tab" href="#sugg_content" role="tab" aria-controls="sugg_content" aria-selected="false">Community Urls</a>\
          <a class="nav-item nav-link" id="preview" data-toggle="tab" href="#prev_content" role="tab" aria-controls="prev_content" aria-selected="false">Preview my urls</a>\
          <a class="nav-item nav-link btn btn-primary" id="save" data-toggle="tab" href="#save_content" role="tab" aria-controls="save_content" aria-selected="false" style="margin-left:15px">Direct save</a>\
        </div>\
        <div class="tab-content" id="nav-tabContent">\
          <div class="tab-pane fade" id="sugg_content" role="tabpanel" aria-labelledby="suggestions" style="margin-top:15px"></div>\
          <div class="tab-pane fade" id="prev_content" role="tabpanel" aria-labelledby="preview" style="margin-top:15px"></div>\
          <div class="tab-pane fade" id="save_content" role="tabpanel" aria-labelledby="save" style="margin-top:15px"></div>\
        </div>';
        document.getElementById("content").innerHTML += content;
        homeEventHandlers();
      };
    }
  );
}

//selects a task from the list of tasks for that user
// updates the current task name and alerts to save the data before changing the task again.
function selectTask() {
  console.log("Selecting the task");
  chrome.storage.local.get(
    ["taskname", "startTime", "isDataSaved", "switch"],
    function (result) {
      let presentTask = result.taskname;
      if (presentTask === undefined && result.startTime === undefined) {
        result.isDataSaved = true;
      }
      if (result.isDataSaved) {
        chrome.storage.local.set(
          {
            startTime: Date.now(),
            taskname: document.getElementById("taskSelect").value,
            isDataSaved: false,
          },
          function () {
            document.getElementById(
              "selectedTask"
            ).innerHTML = document.getElementById("taskSelect").value;
          }
        );
      } else {
        alert("Save the work before changing");
        document.getElementById("selectedTask").selected = true;
      }
      homeEventHandlers();
    }
  );
}

// provides the suggestions (urls) for the current task
function getsuggestions() {
  console.log("Getting Community suggestions");
  chrome.storage.local.get(["taskname", "isDataSaved", "switch"], function (
    result
  ) {
    let dataxml = new XMLHttpRequest();
    dataxml.open(
      "GET",
      "http://127.0.0.1:5000/api/suggestions?task=" + result.taskname
    );
    dataxml.send();
    dataxml.onload = function () {
      respns = JSON.parse(dataxml.response);
      if (dataxml.status === 200) {
        let counter = 1;
        let content =
          "<h6>Suggestions for " +
          result.taskname +
          ": </h6><div class='list-group'>";
        respns["data"].forEach((eachUrl) => {
          content +=
            "<a class='list-group-item list-group-item-action' style='word-wrap: break-word' id=s" +
            counter++ +
            " href='" +
            eachUrl +
            "'>" +
            eachUrl +
            "</a>";
        });
        document.getElementById("sugg_content").innerHTML = content + "</div>";
        for (let index = 1; index < counter; index++) {
          document.getElementById("s" + index).addEventListener("click", () => {
            let linkUrl = document.getElementById("s" + index).innerHTML;
            chrome.tabs.create({ url: linkUrl, active: false }, function () {});
          });
        }
      } else {
        document.getElementById("sugg_content").innerHTML =
          '<div class="alert alert-info" role="alert">' +
          respns["error"] +
          "</div>";
      }
      homeEventHandlers();
    };
  });
}

//domains to be ignored
let ignoreURLS = [
  "www.google.com",
  "www.yahoo.com",
  "meet.google.com",
  "mail.google.com",
  "drive.google.com",
  "docs.google.com",
  "hangouts.google.com",
  "photos.google.com",
  "accounts.google.com",
  "slides.google.com",
  "zoom.us",
  "search.yahoo.com",
];

// previews the data (urls) for the current task with an option
//to delete any url before saving to database
function previewData() {
  console.log("Previewing the data");
  let urls = [];
  chrome.storage.local.get(
    ["startTime", "endTime", "useremail", "taskname", "isDataSaved", "switch"],
    function (result) {
      if (result.startTime === undefined) {
        result.startTime = Date.now();
        result.taskname = "";
      }
      if (result.startTime === null) {
        result.startTime = Date.now();
      }
      chrome.history.search(
        {
          text: "",
          maxResults: 100,
          endTime: Date.now(),
          startTime: result.startTime,
        },
        function (data) {
          data.forEach(function (page) {
            if (!ignoreURLS.includes(page.url.split("/")[2])) {
              urls.push(page.url);
            }
          });
          if (urls.length == 0) {
            document.getElementById("prev_content").innerHTML =
              '<div class="alert alert-info" role="alert">No urls to preview for ' +
              result.taskname +
              "</div>";
            homeEventHandlers();
            return;
          }
          let content =
            "<div><h6 style='display:inline'>Previewing the data for " +
            result.taskname +
            ":</h6><button class='btn btn-primary' id='previewSave' style='margin-bottom:15px; float:right'>Save</button><table class='table table-bordered' style='table-layout: fixed; width: 100%;'>";
          let counter = 1;
          urls.forEach(function (each) {
            content +=
              "<tr><td style='word-wrap: break-word; width:410px' value='" +
              each +
              "'><a class='" +
              counter +
              "' href='" +
              each +
              "'>" +
              each +
              "</a></td><td><a href='#' id='d" +
              counter++ +
              "'><i class='material-icons'>delete</i></a></td></tr>";
          });
          content += "</table></div>";
          document.getElementById("prev_content").innerHTML = content;
          for (let index = 1; index < counter; index++) {
            document
              .querySelector("[class='" + index + "']")
              .addEventListener("click", () => {
                let linkUrl = document.querySelector("[class='" + index + "']")
                  .innerHTML;
                chrome.tabs.create(
                  { url: linkUrl, active: false },
                  function () {}
                );
              });
            document
              .getElementById("d" + index)
              .addEventListener("click", () => {
                let parent = document.getElementById("d" + index).parentElement
                  .parentElement;
                let url = parent
                  .getElementsByTagName("td")[0]
                  .getAttribute("value");
                urls = urls.filter(function (value) {
                  return value != url;
                });
                parent.remove();
              });
          }
          homeEventHandlers();
          document
            .getElementById("previewSave")
            .addEventListener("click", () => {
              savePreviewedData(
                urls,
                result.taskname,
                result.useremail,
                result
              );
            });
        }
      );
    }
  );
}

//saves the previewed data to the database
function savePreviewedData(urllist, taskname, useremail, result) {
  console.log("Saving previewed data");
  let urls = "";
  urllist.forEach(function (url) {
    urls += url + " ";
  });
  let taskxml = new XMLHttpRequest();
  taskxml.open(
    "GET",
    "http://127.0.0.1:5000/api/saveData?taskname=" +
      taskname +
      "&urls=" +
      encodeURIComponent(urls) +
      "&email=" +
      encodeURIComponent(useremail)
  );
  taskxml.send();
  taskxml.onload = function () {
    chrome.storage.local.set(
      { isDataSaved: true, startTime: Date.now() },
      function () {}
    );
    document.getElementById("prev_content").innerHTML =
      '<div class="alert alert-success" role="alert">Data Saved to ' +
      result.taskname +
      "</div>";
    homeEventHandlers();
  };
}

// saves the data (urls) directly to database for the current task
function saveMyData() {
  console.log("Saving the data so far");
  let urls = "";
  chrome.storage.local.get(
    ["startTime", "useremail", "taskname", "isDataSaved", "switch"],
    function (result) {
      if (result.startTime === undefined) {
        result.startTime = Date.now();
        result.taskname = "";
      }
      if (result.startTime === null) {
        result.startTime = Date.now();
      }
      chrome.history.search(
        {
          text: "",
          maxResults: 100,
          endTime: Date.now(),
          startTime: result.startTime,
        },
        function (data) {
          data.forEach(function (page) {
            if (!ignoreURLS.includes(page.url.split("/")[2])) {
              urls += page.url + " ";
            }
          });
          let taskxml = new XMLHttpRequest();
          taskxml.open(
            "GET",
            "http://127.0.0.1:5000/api/saveData?taskname=" +
              result.taskname +
              "&urls=" +
              encodeURIComponent(urls) +
              "&email=" +
              encodeURIComponent(result.useremail)
          );
          taskxml.send();
          taskxml.onload = function () {
            document.getElementById("save_content").innerHTML =
              '<div class="alert alert-success" role="alert">Data Saved to ' +
              result.taskname +
              "</div>";
            chrome.storage.local.set(
              { isDataSaved: true, startTime: Date.now() },
              function () {}
            );
            homeEventHandlers();
          };
        }
      );
    }
  );
}

//provides the user data stored in database until now
function getyourData() {
  console.log("Getting user activity");
  chrome.storage.local.get(["useremail", "username"], function (result) {
    let cn = result.username;
    let ce = result.useremail;
    document.getElementById("content").innerHTML = "<h5>My Activity</h5>";
    let dataxml = new XMLHttpRequest();
    dataxml.open(
      "GET",
      "http://127.0.0.1:5000/api/userData?email=" + encodeURIComponent(ce)
    );
    dataxml.send();
    dataxml.onload = function () {
      respns = JSON.parse(dataxml.response);
      if (dataxml.status === 200) {
        let counter = 1;
        let content = '<div class="accordion" id="sentData">';
        respns["data"].forEach((ele) => {
          let element = ele["taskName"];
          let idElement = element + "collapse";
          content +=
            '<div class="card"><div class="card-header" id="' +
            element +
            '"><button class="btn btn-link" type="button" data-toggle="collapse" data-target="#' +
            idElement +
            '" aria-expanded="true" aria-controls="' +
            idElement +
            '">' +
            element +
            '</button></div><div id="' +
            idElement +
            '" class="collapse" aria-labelledby="' +
            element +
            '" data-parent="#sentData"><div class="card-body list-group list-group-flush">';
          ele["urls"].forEach((eachUrl) => {
            content +=
              "<a class='list-group-item' id=" +
              counter++ +
              " href='" +
              eachUrl +
              "'>" +
              eachUrl +
              "</a>";
          });
          content += "</div></div></div>";
        });
        content += "</div>";
        document.getElementById("content").innerHTML += content;
        for (let index = 1; index < counter; index++) {
          document.getElementById(index).addEventListener("click", () => {
            let linkUrl = document.getElementById(index).innerHTML;
            chrome.tabs.create({ url: linkUrl, active: false }, function () {});
          });
        }
      } else {
        document.getElementById("content").innerHTML += respns["error"];
      }
    };
  });
}

//User names to be displayed as suggestions while sending messages
let names;

//for sending messages to users via a form
function msgsFunc() {
  document.getElementById("content").innerHTML =
    '<form id="msgForm" autocomplete="off">\
      <label class="sr-only" for="textMsg">Name</label>\
      <input type="text" class="form-control mb-2 mr-sm-2" id="textMsg" placeholder="Your msg here" required>\
      <div class="input-group mb-2 mr-sm-2">\
        <div class="input-group-prepend">\
          <div class="input-group-text" style="width:41px">@</div>\
        </div><div class="autocomplete">\
        <input type="text" class="form-control" id="username" placeholder="Username" style="width:409px" required>\
      </div></div>\
      <button type="submit" class="btn btn-primary mb-2" id="send">Send</button>\
    </form>\
    <div id="response"></div>\
    <div class="nav nav-tabs" id="nav-tab" role="tablist">\
      <a class="nav-item nav-link" id="sent" data-toggle="tab" href="#sent_content" role="tab" aria-controls="sent_content" aria-selected="false">Sent</a>\
      <a class="nav-item nav-link" id="rec" data-toggle="tab" href="#rec_content" role="tab" aria-controls="rec_content" aria-selected="false">Received</a>\
    </div>\
    <div class="tab-content" id="nav-tabContent">\
      <div class="tab-pane fade" id="sent_content" role="tabpanel" aria-labelledby="sent"></div>\
      <div class="tab-pane fade" id="rec_content" role="tabpanel" aria-labelledby="rec"></div>\
    </div>';
  chrome.storage.local.get(["useremail"], function (result) {
    let xml = new XMLHttpRequest();
    xml.open(
      "GET",
      "http://127.0.0.1:5000/api/getUsernames?email=" +
        encodeURIComponent(result.useremail)
    );
    xml.send();
    xml.onload = function () {
      let response = JSON.parse(xml.response);
      names = response["names"];
    };
    msgEventHandlers();
  });
}

//autocomplete event handler for user name
function autocomplete(inp, arr) {
  let currentFocus;
  /*execute a function when someone writes in the text field:*/
  inp.addEventListener("input", function (e) {
    let a,
      b,
      i,
      val = this.value;
    closeAllLists();
    if (!val) {
      return false;
    }
    currentFocus = -1;
    /*create a DIV element that will contain the items (values):*/
    a = document.createElement("DIV");
    a.setAttribute("id", this.id + "autocomplete-list");
    a.setAttribute("class", "autocomplete-items");
    this.parentNode.appendChild(a);
    for (i = 0; i < arr.length; i++) {
      if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
        /*create a DIV element for each matching element:*/
        b = document.createElement("DIV");
        b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
        b.innerHTML += arr[i].substr(val.length);
        b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
        /*execute a function when someone clicks on the item value (DIV element):*/
        b.addEventListener("click", function (e) {
          inp.value = this.getElementsByTagName("input")[0].value;
          closeAllLists();
        });
        a.appendChild(b);
      }
    }
    /*execute a function presses a key on the keyboard:*/
    inp.addEventListener("keydown", function (e) {
      let x = document.getElementById(this.id + "autocomplete-list");
      if (x) x = x.getElementsByTagName("div");
      if (e.keyCode == 40) {
        //DOWN key
        currentFocus++;
        addActive(x);
      } else if (e.keyCode == 38) {
        //up key
        currentFocus--;
        addActive(x);
      } else if (e.keyCode == 13) {
        e.preventDefault();
        if (currentFocus > -1) {
          if (x) x[currentFocus].click();
        }
      }
    });
  });

  function addActive(x) {
    /*a function to classify an item as "active":*/
    if (!x) return false;
    removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = x.length - 1;
    x[currentFocus].classList.add("autocomplete-active");
  }
  function removeActive(x) {
    /*a function to remove the "active" class from all autocomplete items:*/
    for (let i = 0; i < x.length; i++) {
      x[i].classList.remove("autocomplete-active");
    }
  }
  function closeAllLists(elmnt) {
    /*close all autocomplete lists in the document,
    except the one passed as an argument:*/
    let x = document.getElementsByClassName("autocomplete-items");
    for (let i = 0; i < x.length; i++) {
      if (elmnt != x[i] && elmnt != inp) {
        x[i].parentNode.removeChild(x[i]);
      }
    }
  }
  /*execute a function when someone clicks in the document:*/
  document.addEventListener("click", function (e) {
    closeAllLists(e.target);
  });
}

//sends an api request for sending the msg
function sendMsg(event) {
  event.preventDefault();
  chrome.storage.local.get(["useremail"], function (result) {
    console.log("Sending the message");
    let msgText = document.getElementById("textMsg").value;
    let xml = new XMLHttpRequest();
    let toemail =
      document.getElementById("username").value + "@msitprogram.net";
    let url =
      "http://127.0.0.1:5000/api/msg?toE=" +
      encodeURIComponent(toemail) +
      "&fromE=" +
      encodeURIComponent(result.useremail) +
      "&message=" +
      encodeURIComponent(msgText);
    xml.open("GET", url);
    xml.send();
    xml.onload = function () {
      let response = JSON.parse(xml.response);
      if (xml.status === 200) {
        document.getElementById("response").innerHTML =
          '<div class="alert alert-success" role="alert">\
        Message sent!\
        </div>';
        document.getElementById("msgForm").reset();
      } else {
        document.getElementById("response").innerHTML =
          '<div class="alert alert-danger" role="alert">' +
          response.error +
          "</div>";
      }
      msgEventHandlers();
    };
  });
}

//view the sent msgs
function viewSent() {
  console.log("Getting sent logs");
  document.getElementById("response").innerHTML = "";
  chrome.storage.local.get(["useremail"], function (result) {
    let xml = new XMLHttpRequest();
    let url = new URL("http://127.0.0.1:5000/api/sent");
    url.searchParams.set("email", encodeURIComponent(result.useremail));
    xml.open("GET", url);
    xml.onload = function () {
      sentLogs = JSON.parse(xml.response);
      if (xml.status === 200) {
        let content = '<div class="accordion" id="sentData">';
        Object.keys(sentLogs).forEach((ele) => {
          let element = ele.replace(" ", "");
          let idElement = element + "collapse";
          content +=
            '<div class="card"><div class="card-header" id="' +
            element +
            '"><button class="btn btn-link" type="button" data-toggle="collapse" data-target="#' +
            idElement +
            '" aria-expanded="true" aria-controls="' +
            idElement +
            '">' +
            element +
            '</button></div><div id="' +
            idElement +
            '" class="collapse" aria-labelledby="' +
            element +
            '" data-parent="#sentData"><div class="card-body list-group list-group-flush">';
          sentLogs[ele].forEach((each) => {
            content +=
              "<li class='list-group-item'>" +
              each[0] +
              " <span style='color:grey;float:right'>" +
              each[1] +
              "</span></li>";
          });
          content += "</div></div></div>";
        });
        content += "</div>";
        document.getElementById("sent_content").innerHTML = content;
      } else {
        document.getElementById("sent_content").innerHTML = sentLogs["error"];
      }
    };
    xml.send();
    msgEventHandlers();
  });
}

//view the received msgs
function viewRec() {
  console.log("Getting received logs");
  document.getElementById("response").innerHTML = "";
  chrome.storage.local.get(["useremail"], function (result) {
    let xml = new XMLHttpRequest();
    let url = new URL("http://127.0.0.1:5000/api/recv");
    url.searchParams.set("email", encodeURIComponent(result.useremail));
    xml.open("GET", url);
    xml.onload = function () {
      recvLogs = JSON.parse(xml.response);
      if (xml.status === 200) {
        let content = '<div class="accordion" id="recvData">';
        Object.keys(recvLogs).forEach((ele) => {
          let element = ele.replace(" ", "");
          let idElement = element + "collapse";
          content +=
            '<div class="card"><div class="card-header" id="' +
            element +
            '"><button class="btn btn-link" type="button" data-toggle="collapse" data-target="#' +
            idElement +
            '" aria-expanded="true" aria-controls="' +
            idElement +
            '">' +
            element +
            '</button></div><div id="' +
            idElement +
            '" class="collapse" aria-labelledby="' +
            element +
            '" data-parent="#recvData"><div class="card-body list-group list-group-flush">';
          recvLogs[ele].forEach((each) => {
            content +=
              "<li class='list-group-item'>" +
              each[0] +
              " <span style='color:grey;float:right'>" +
              each[1] +
              "</span></li>";
          });
          content += "</div></div></div>";
        });
        content += "</div>";
        document.getElementById("rec_content").innerHTML = content;
      } else {
        document.getElementById("rec_content").innerHTML = recvLogs["error"];
      }
    };
    xml.send();
    msgEventHandlers();
  });
}

//to display the notifications
function notifyFunc() {
  console.log("Getting notifications");
  chrome.storage.local.get(["useremail"], function (result) {
    let xml = new XMLHttpRequest();
    xml.open(
      "GET",
      "http://127.0.0.1:5000/api/displayUnread?email=" +
        encodeURIComponent(result.useremail)
    );
    xml.onload = function () {
      unreadLogs = JSON.parse(xml.response);
      if (xml.status === 200) {
        let content = '<div class="accordion" id="recvData">';
        Object.keys(unreadLogs).forEach((ele) => {
          let element = ele.replace(" ", "");
          let idElement = element + "collapse";
          content +=
            '<div class="card"><div class="card-header" id="' +
            element +
            '"><button class="btn btn-link" type="button" data-toggle="collapse" data-target="#' +
            idElement +
            '" aria-expanded="true" aria-controls="' +
            idElement +
            '">' +
            element +
            '</button></div><div id="' +
            idElement +
            '" class="collapse show" aria-labelledby="' +
            element +
            '" data-parent="#recvData"><div class="card-body list-group list-group-flush">';
          unreadLogs[ele].forEach((each) => {
            content +=
              "<li class='list-group-item'>" +
              each[0] +
              " <span style='color:grey;float:right'>" +
              each[1] +
              "</span></li>";
          });
          content += "</div></div></div>";
        });
        content += "</div>";
        document.getElementById("content").innerHTML = content;
      } else {
        document.getElementById("content").innerHTML =
          '<div class="alert alert-info" role="alert">' +
          unreadLogs["error"] +
          "</div>";
      }
    };
    xml.send();
    chrome.browserAction.setBadgeText({ text: "" });
    document.getElementById("notifbadge").style.visibility = "hidden";
    chrome.storage.local.set({ unreadCount: 0 }, function () {});
  });
}

//home event handlers
function homeEventHandlers() {
  // event listeners
  document.getElementById("message").addEventListener("click", msgsFunc);
  document.getElementById("notification").addEventListener("click", notifyFunc);
  document.getElementById("logout").addEventListener("click", logoutFunc);
  document.getElementById("urdata").addEventListener("click", getyourData);
  document.getElementById("home").addEventListener("click", displayExtension);
  document.getElementById("message").style.visibility = "visible";
  document.getElementById("notification").style.visibility = "visible";
  document.getElementById("urdata").style.visibility = "visible";
  document.getElementById("logout").style.visibility = "visible";
  document.getElementById("switch").addEventListener("click", switchEvent);
  taskEventHandlers();
}

//task page event handlers
function taskEventHandlers() {
  document
    .getElementById("suggestions")
    .addEventListener("click", getsuggestions);
  document.getElementById("preview").addEventListener("click", previewData);
  document.getElementById("save").addEventListener("click", saveMyData);
  document.getElementById("taskSelect").addEventListener("change", selectTask);
}

//message event handlers
function msgEventHandlers() {
  document.getElementById("msgForm").addEventListener("submit", sendMsg);
  document.getElementById("textMsg").addEventListener("keydown", () => {
    document.getElementById("response").innerHTML = "";
  });
  document.getElementById("username").addEventListener("keydown", () => {
    document.getElementById("response").innerHTML = "";
    autocomplete(document.getElementById("username"), names);
  });
  document.getElementById("sent").addEventListener("click", viewSent);
  document.getElementById("rec").addEventListener("click", viewRec);
}
