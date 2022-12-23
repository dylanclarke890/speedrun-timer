class SplitsIOModel {
  static from(data = {}) {
    return Object.assign(new this(), data);
  }
}

class SplitsIORunner extends SplitsIOModel {
  id;
  twitch_id;
  twitch_name;
  display_name;
  name;
  avatar;
  created_at;
  updated_at;
}

class SplitsIOCategory extends SplitsIOModel {
  id;
  name;
  created_at;
  updated_at;
}

class SplitsIOGame extends SplitsIOModel {
  id;
  name;
  shortname;
  created_at;
  updated_at;
  categories;
  srdc_id;
  cover_url;

  static from(/** @type {SplitsIOGame || {}} */ data = {}) {
    const model = new SplitsIOGame();
    assignToThis = (key, value) => Object.defineProperty(model, key, { value });
    Object.keys(data).forEach((key) => {
      switch (key) {
        case "categories":
          assignToThis(
            key,
            data[key].map((categoryData) => SplitsIOCategory.from(categoryData))
          );
          break;
        default:
          assignToThis(key, data[key]);
          break;
      }
    });

    return model;
  }
}

class SplitsIOSegment extends SplitsIOModel {
  id;
  name;
  display_name;
  segment_number;

  realtime_start_ms;
  realtime_duration_ms;
  realtime_end_ms;
  realtime_shortest_duration_ms;
  realtime_gold;
  realtime_skipped;
  realtime_reduced;

  gametime_start_ms;
  gametime_duration_ms;
  gametime_end_ms;
  gametime_shortest_duration_ms;
  gametime_gold;
  gametime_skipped;
  gametime_reduced;
}

class SplitsIOHistory extends SplitsIOModel {
  attempt_number;
  realtime_duration_ms;
  gametime_duration_ms;
  started_at;
  ended_at;
}

class SplitsIORun extends SplitsIOModel {
  id;
  srdc_id;

  realtime_duration_ms;
  realtime_sum_of_best_ms;

  gametime_duration_ms;
  gametime_sum_of_best_ms;

  default_timing;
  program;
  attempts;
  created_at;
  updated_at;
  parsed_at;
  image_url;
  video_url;

  game;
  category;
  runners;
  segments;
  histories;

  static from(/** @type {SplitsIORun || {}} */ data = {}) {
    const model = new SplitsIORun();
    assignToThis = (key, value) => Object.defineProperty(model, key, { value });
    Object.keys(data).forEach((key) => {
      switch (key) {
        case "game":
          assignToThis(key, SplitsIOGame.from(data[key]));
          break;
        case "category":
          assignToThis(key, SplitsIOCategory.from(data[key]));
          break;
        case "runners":
          assignToThis(
            key,
            data[key].map((runnerData) => SplitsIOCategory.from(runnerData))
          );
          break;
        case "segments":
          assignToThis(
            key,
            data[key].map((segmentData) => SplitsIOSegment.from(segmentData))
          );
          break;
        case "histories":
          assignToThis(
            key,
            data[key].map((historyData) => SplitsIOHistory.from(historyData))
          );
          break;
        default:
          assignToThis(key, data[key]);
          break;
      }
    });

    return model;
  }
}