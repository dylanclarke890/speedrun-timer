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
    window.run = TimeItSpeedRun.from(fetchedRun);
  });
});
