UI.onPageReady(() => {
  const client = new SplitsIOApiClient();

  const testGetBtn = document.getElementById("testGet");
  UI.addEvent(testGetBtn, "click", async () => {
    const runData = await client.run.get("9okq");
    const fetchedRun = SplitsIORun.from(runData.run);
    console.log(fetchedRun);
    const gameData = await client.game.get("re7");
    const fetchedGame = SplitsIOGame.from(gameData.game);
    console.log(fetchedGame);
  });

  const segments = [
    new TimeItSegment({
      name: "Free Mia Cutscene",
      endedAt: 60000,
      bestDuration: 60000,
    }),
    new TimeItSegment({
      name: "Welcome to the family son",
      endedAt: 121000,
      bestDuration: 61000,
    }),
    new TimeItSegment({
      name: "Watch this *blows face off*",
      endedAt: 0,
      bestDuration: 0,
    }),
    new TimeItSegment({
      endedAt: 0,
      bestDuration: 0,
    }),
  ];

  window.run = new TimeItSpeedRun({ segments });
});
