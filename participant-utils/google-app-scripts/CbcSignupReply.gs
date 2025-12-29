/**
 * Auto-responds to emails sent to bloomingtonmncbc+signup@gmail.com.
 */
function autoReplyToSignup() {
  const ALIAS_EMAIL = "bloomingtonmncbc+signup@gmail.com";
  const SUBJECT_FILTER = "Bloomington CBC signup steps";
  const REPLY_TO_ADDRESS = "bloomingtonmncbc@gmail.com";
  const SIGNUP_REPLY_LABEL = "Signup-Replied"

  const draft = GmailApp.getDrafts().find(d => d.getMessage().getSubject() === SUBJECT_FILTER);

  if (!draft) {
    Logger.log("Draft template not found.");
    return;
  }
  const draftMessage = draft.getMessage();
  const replyBody = draftMessage.getBody();
  const replyAttachments = draftMessage.getAttachments();
  const imgRegex = /<img.*?src="cid:(.*?)".*?alt="(.*?)"/g;
  let match;
  const cidMap = {};

  while ((match = imgRegex.exec(replyBody)) !== null) {
    // match[1] is the cid (e.g., ii_kl736chs6)
    // match[2] is the filename (e.g., image.png)
    cidMap[match[2]] = match[1];
    Logger.log(`Found: Filename: ${match[2]}, CID: ${match[1]}`);
  }

  const threads = GmailApp.search(`to:${ALIAS_EMAIL} is:unread`);
  if(threads.length) {
    Logger.log(`Found ${threads.length} new emails to ${ALIAS_EMAIL}`);
  }

  for (const thread of threads) {
    const labels = thread.getLabels().map(l => l.getName());


    if (!labels.includes(SIGNUP_REPLY_LABEL)) {

      thread.reply("", {
        htmlBody: replyBody,
        name: "Bloomington CBC",
        replyTo: REPLY_TO_ADDRESS,
        attachments: replyAttachments
      });

      thread.markRead();
      addLabelToThread(thread, SIGNUP_REPLY_LABEL);

      Logger.log(`Replied to email via ${ALIAS_EMAIL}. Replies directed to ${REPLY_TO_ADDRESS}`);
    }
  }
}

function addLabelToThread(thread, labelName) {
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
  }
  thread.addLabel(label);
}