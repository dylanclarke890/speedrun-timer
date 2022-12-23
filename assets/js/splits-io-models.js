class SplitsIOModel {
  static from(data = {}) {
    Object.assign(this, data);
  }
}

class Runner extends SplitsIOModel {
  id;
  twitch_id;
  twitch_name;
  display_name;
  name;
  avatar;
  created_at;
  updated_at;
}

class Category extends SplitsIOModel {
  id;
  name;
  created_at;
  updated_at;
}

class Game extends SplitsIOModel {
  id;
  name;
  shortname;
  created_at;
  updated_at;
  categories;
  srdc_id;
  cover_url;

  static from(data = {}) {
    assignToThis = (key, value) => Object.defineProperty(this, key, { value });
    Object.keys(data).forEach((key) => {
      switch (key) {
        case "categories":
          assignToThis(
            key,
            data[key].map((categoryData) => Category.from(categoryData))
          );
          break;
        default:
          assignToThis(key, data[key]);
          break;
      }
    });
  }
}

class Segment extends SplitsIOModel {
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

class History extends SplitsIOModel {
  attempt_number;
  realtime_duration_ms;
  gametime_duration_ms;
  started_at;
  ended_at;
}

class Run extends SplitsIOModel {
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

  static from(data = {}) {
    assignToThis = (key, value) => Object.defineProperty(this, key, { value });
    Object.keys(data).forEach((key) => {
      switch (key) {
        case "game":
          assignToThis(key, Game.from(data[key]));
          break;
        case "category":
          assignToThis(key, Category.from(data[key]));
          break;
        case "runners":
          assignToThis(
            key,
            data[key].map((runnerData) => Category.from(runnerData))
          );
          break;
        case "segments":
          assignToThis(
            key,
            data[key].map((segmentData) => Segment.from(segmentData))
          );
          break;
        case "histories":
          assignToThis(
            key,
            data[key].map((historyData) => History.from(historyData))
          );
          break;
        default:
          assignToThis(key, data[key]);
          break;
      }
    });
  }
}
