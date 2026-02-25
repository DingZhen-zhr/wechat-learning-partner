// app.js
App({
  onLaunch: function () {
    this.globalData = {
      // env 参数说明：
      //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
      //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
      //   如不填则使用默认环境（第一个创建的环境）
      // 请注意：传空字符串可能导致某些运行环境出现网络请求失败（Failed to fetch），推荐填写正确的 envId
      env: "cloud1-0grfvk7z3f381632",
      cloudAvailable: false,
    };
    if (!wx.cloud) {
      console.info('[app] 使用的云环境ID：', this.globalData.env);
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      try {
        const initOptions = { traceUser: true };
        // 仅在提供有效 envId 时才传入 env 字段，避免使用空字符串
        if (this.globalData.env && this.globalData.env.length > 0) {
          initOptions.env = this.globalData.env;
        }
        wx.cloud.init(initOptions);
        this.globalData.cloudAvailable = true;
        console.info('[app] wx.cloud.init 成功，env =', initOptions.env || '(默认环境)');
      } catch (e) {
        console.error('[app] wx.cloud.init 失败：', e);
        this.globalData.cloudAvailable = false;
      }
    }
  },
});
