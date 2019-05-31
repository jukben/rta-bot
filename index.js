const request = require("request-promise");
const { send, json } = require("micro");
const { router, get, del, put, post } = require("microrouter");

const GITHUB_NAME = "jukben";
const GITHUB_TOKEN = process.env.TOKEN;
const PROJECT = "webscopeio/react-textarea-autocomplete";
const MESSAGE_TEMPLATE_FN = ({ url }) =>
  `<!-- rta-bot -->\n\nHey! Thank you so much for your PR!\n\n[Here is the playground for this revision](${url}) 🚀\n\nI hope everything is fine! ❤️\n\n_This message has been generated [automagically](https://github.com/jukben/rta-bot) ✨_`;

const REQUEST_SETTINGS = {
  json: true,
  method: "GET",
  headers: {
    "User-Agent": "RTA-Bot"
  },
  auth: {
    user: GITHUB_NAME,
    pass: GITHUB_TOKEN
  }
};

if (!GITHUB_TOKEN) {
  throw new Error("TOKEN not found! Have you set the env correctly?");
}

const generateURL = ({ buildNumber, nodeIndex }) =>
  `https://${buildNumber}-94480675-gh.circle-artifacts.com/${nodeIndex}/example/index.html`;

const sendComment = async (req, res) => {
  let { prURL, buildNumber, nodeIndex } = await json(req);

  let issueId = prURL.match(/[0-9]+$/);
  if (issueId) {
    issueId = issueId[0];
  }

  let comments = [];
  try {
    comments = await request(
      `https://api.github.com/repos/${PROJECT}/issues/${issueId}/comments`,
      REQUEST_SETTINGS
    );
  } catch (error) {
    return send(res, 500, { status: "ERROR", error });
  }

  const alreadyPostedComment = comments.find(({ user: { login }, body }) => {
    return login === GITHUB_NAME && /rta-bot/.test(body);
  });

  console.log(issueId, alreadyPostedComment);
  try {
    const sentComment = await request(
      alreadyPostedComment
        ? `https://api.github.com/repos/${PROJECT}/issues/comments/${
            alreadyPostedComment.id
          }`
        : `https://api.github.com/repos/${PROJECT}/issues/${issueId}/comments`,
      {
        ...REQUEST_SETTINGS,
        method: alreadyPostedComment ? "PATCH" : "POST",
        body: {
          body: MESSAGE_TEMPLATE_FN({
            url: generateURL({ buildNumber, nodeIndex })
          })
        }
      }
    );
  } catch (error) {
    return send(res, 500, { status: "ERROR", error });
  }

  send(res, 200, { status: "OK" });
};

const invalid = (req, res) => send(res, 404, { status: "ERROR" });

module.exports = router(
  post("/", sendComment),
  get("/*", invalid),
  del("/*", invalid),
  put("/*", invalid),
  post("/*", invalid)
);
