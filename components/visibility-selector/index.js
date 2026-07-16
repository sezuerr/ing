const { VISIBILITY_OPTIONS } = require("../../utils/constants");

Component({
  properties: {
    value: {
      type: String,
      value: "public"
    }
  },

  data: {
    options: VISIBILITY_OPTIONS
  },

  methods: {
    select(event) {
      this.triggerEvent("change", { value: event.currentTarget.dataset.value });
    }
  }
});
