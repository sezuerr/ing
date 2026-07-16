const { TOPIC_ICONS } = require("../../utils/constants");

Component({
  properties: {
    value: {
      type: String,
      value: "💡"
    }
  },

  data: {
    open: false,
    icons: TOPIC_ICONS
  },

  methods: {
    toggle() {
      this.setData({ open: !this.data.open });
    },

    selectIcon(event) {
      const icon = event.currentTarget.dataset.icon;
      this.setData({ open: false });
      this.triggerEvent("change", { value: icon });
    }
  }
});
