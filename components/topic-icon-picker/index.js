const { TOPIC_ICONS } = require("../../utils/constants");

Component({
  properties: {
    value: {
      type: String,
      value: ""
    }
  },

  data: {
    icons: TOPIC_ICONS,
    open: false
  },

  methods: {
    toggle() {
      this.setData({ open: !this.data.open });
    },

    selectIcon(event) {
      const icon = event.currentTarget.dataset.icon;
      this.triggerEvent("change", { value: icon === this.data.value ? "" : icon });
      this.setData({ open: false });
    }
  }
});
