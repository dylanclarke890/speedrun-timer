class Runner {
  id;
  twitch_id;
  twitch_name;
  display_name;
  name;
  avatar;
  created_at;
  updated_at;
}

class Category {
  id;
  name;
  created_at;
  updated_at;
}

class Game {
  id;
  name;
  shortname;
  created_at;
  updated_at;
  categories;
  srdc_id;
  cover_url;
}

class Segment {
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

class History {
  attempt_number;
  realtime_duration_ms;
  gametime_duration_ms;
  started_at;
  ended_at;
}

class Run {
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
}
