console.log("home script attached!!");

let baseUrl = "http://localhost:3000/";

let signInUrl = "http://127.0.0.1:5500/client/signin.html";

let chatListContainer = document.getElementById("chatListContainer");
let chatContainer = document.getElementById("chatMessagesContainer");
let currentChatContainerUserId = null;
let socket;
let publicKey; // publicKey of current friend

window.onload = function (e) {
  let token = localStorage.getItem("secret-chat-token");

  // verify access token
  if (token) {
    let data = { token };
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };

    fetch(baseUrl + "user/verify", requestOptions).then(async (response) => {
      let res = await response.json();
      if (res.error) {
        localStorage.removeItem("secret-chat-token");
        window.location.href = signInUrl;
      }
    });
  } else {
    // else redirect to signin page
    window.location.href = signInUrl;
  }

  socket = io(baseUrl, {
    auth: {
      token: token,
    },
  });

  const requestOptions = {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      authorization: token,
    },
  };

  // fetch chatlist of user
  fetch(baseUrl + "chat/chatlist", requestOptions).then(async (response) => {
    let res = await response.json();
    if (res.code == 200) {
      console.log("CHAT LIST ", res);
      let chatList = res.data;
      chatList.map((id) => {
        chatListContainer.innerHTML += chatListElement(id);
      });
    } else {
      localStorage.removeItem("secret-chat-token");
      window.location.href = signInUrl;
    }
  });

  socket.on("connect", () => {
    console.log(socket.id); // "G5p5..."
  });

  // attempt to reconnect
  socket.on("disconnect", () => {
    socket.connect();
  });

  // receive message
  socket.on("chat:receive", (data) => {
    if (data.from == currentChatContainerUserId) {
      let messageUI = chatMessage(data.from, data.message);
      let chatHistory = document.querySelector(".chat-history-messages");
      chatHistory.innerHTML += messageUI;
      console.log("CHAT HISTORY ", chatHistory);
    }
  });
};

// function to get chats with particular user
function renderChat(friendId) {
  console.log("FETCH CHAT OF ID ", friendId);
  let token = localStorage.getItem("secret-chat-token");
  let id = localStorage.getItem("secret-chat-id");

  let data = { friendId };
  const requestOptions = {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      authorization: token,
    },
    body: JSON.stringify(data),
  };

  // fetch chatlist of user
  fetch(baseUrl + "chat/chatmessages", requestOptions).then(
    async (response) => {
      let res = await response.json();
      if (res.code == 200) {
        publicKey = res.key;
        chatContainer.innerHTML = chatMessages(friendId, res.data, id, publicKey);
        currentChatContainerUserId = friendId;
      } else {
        alert("Error fetching current chat messages!!");
      }
    }
  );
}

// encrypting chat message
function encryptWithPublicKey(friendPublicKey, message) {
  // Encrypt with the public key...
  let encrypt = new JSEncrypt();
  encrypt.setPublicKey(friendPublicKey);
  let encrypted = encrypt.encrypt(message);
  console.log('Ecrypted ', encrypted);
  return encrypted;
}

// decrypt chat message
function decryptWithPrivateKey(message){
  let decrypt = new JSEncrypt();
  let privateKey = localstorage.getItem("secret-chat-key"); // TODO: convert to JSON
  decrypt.setPrivateKey(privateKey);
  let uncrypted = decrypt.decrypt(message);
  return uncrypted;
}


// socket method to send message
function sendMessagetoFriend() {
  let id = localStorage.getItem("secret-chat-id");
  let message = document.getElementById("message-input-box").value;

  // emit a socket event
  let data = {
    from: id,
    to: currentChatContainerUserId,
    message: encryptWithPublicKey(publicKey, message), // TODO: send encrypted message
  };

  console.log("Message ", message);

  socket.emit("chat:send", data);

  // append message to UI
  let messageUI = chatMessage(id, message);

  console.log("Message UI", messageUI);

  let chatHistory = document.querySelector(".chat-history-messages");
  chatHistory.innerHTML += messageUI;
  console.log("CHAT HISTORY ", chatHistory);
}

// ################ UI ELEMENTS ###################

// chat list element UI generator
function chatListElement(id) {
  return `
        <li class="clearfix" onclick="renderChat(this.id)" id="${id}">
            <img
                src="https://bootdey.com/img/Content/avatar/avatar2.png"
                alt="avatar"
            />
            <div class="about">
                <div class="name">${id}</div>
            </div>
        </li>
    `;
}

// inject new message in chat
function chatMessage(id, message) {
  let myId = localStorage.getItem("secret-chat-id");

  if (myId == id) {
    return `<li class="clearfix">
      <div class="message other-message float-right">
        ${message}
      </div>
    </li>`;
  } else {
    return `<li class="clearfix">
      <div class="message my-message">
      ${message}
      </div>
    </li>`;
  }
}

// chatMessages element UI generator
function chatMessages(friendId, chatMessages, id, publicKey) {
  return `
    <div class="chat-header clearfix">
      <div class="row">
        <div class="col-lg-6">
          <a
            href="javascript:void(0);"
            data-toggle="modal"
            data-target="#view_info"
          >
            <img
              src="https://bootdey.com/img/Content/avatar/avatar2.png"
              alt="avatar"
            />
          </a>
          <div class="chat-about">
            <h6 class="m-b-0">${friendId}</h6>
          </div>
        </div>
        <div class="col-lg-6 hidden-sm text-right">
          <a href="javascript:void(0);" class="btn btn-outline-info"
            ><i class="fa fa-cogs"></i
          ></a>
        </div>
      </div>
    </div>
    <div class="chat-history">
      <ul class="m-b-0 chat-history-messages">
        ${chatMessages.map((message) => {
          if (message.from == id) {
            return `<li class="clearfix">
                <div class="message other-message float-right">
                  ${message.message}
                </div>
              </li>`;
          } else {
            return `<li class="clearfix">
            <div class="message my-message">
            ${message.message}
            </div>
          </li>`;
          }
        })}
      </ul>
    </div>`;
}
