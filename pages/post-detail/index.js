const api = require("../../utils/cloud");

Page({
  data: {
    post: {},
    comments: []
  },

  async onLoad(options) {
    const result = await api.getPostDetail(options.id);
    this.setData({
      post: result.post || {},
      comments: result.comments || []
    });
  }
});
