const { notarize } = require("@electron/notarize");
const path = require("path");

module.exports = async function (context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== "darwin") {
    return;
  }

  const appName = context.packager.appInfo.productName;

  console.log("🔐 Notarizing app:", appName);

  await notarize({
    appBundleId: "com.graphnode.app",
    appPath: path.join(appOutDir, `${appName}.app`),
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.TEAM_ID,
  });
};
