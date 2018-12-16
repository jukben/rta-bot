const request = require("request-promise");
const { send, json } = require("micro");
const { router, get, del, put, post } = require("microrouter");

const GITHUB_NAME = "jukben";
const GITHUB_TOKEN = process.env.TOKEN;
const PROJECT = "webscopeio/react-textarea-autocomplete";
const MESSAGE_TEMPLATE_FN = ({ url }) =>
  `(bot)\n\nHey! Thank you so much for your PR! I can see that everything is green 👏.\n\n[Here is the playground for this revision](${url}) 🚀\n\nI hope everything is fine! ❤️`;

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
  } catch (e) {
    return send(res, 500, { status: "ERROR" });
  }

  const isAlreadyCommented = !!comments.filter(({ user: { login }, body }) => {
    return login === GITHUB_NAME && /^\(bot\)/.test(body);
  }).length;

  if (isAlreadyCommented) {
    return send(res, 200, { status: "IGNORED" });
  }

  const url = generateURL({ buildNumber, nodeIndex });

  try {
    const sentComment = await request(
      `https://api.github.com/repos/${PROJECT}/issues/${issueId}/comments`,
      {
        ...REQUEST_SETTINGS,
        method: "POST",
        body: { body: MESSAGE_TEMPLATE_FN({ url }) }
      }
    );
  } catch (e) {
    return send(res, 500, { status: "ERROR" });
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
