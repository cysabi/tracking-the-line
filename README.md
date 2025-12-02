# `tracking-the-line`
> track your x power as you raise the line

## usage
Add the bot to your server with this link: https://discord.com/oauth2/authorize?client_id=1444539342025396245

`/xp [power]` to set your starting power calc
`/xp +[delta]` to update your power
`/xp` to view a graph of your power over the course of the season.

## local setup
The discord bot works by hosting a [discord interaction endpoint](https://discord.com/developers/docs/interactions/receiving-and-responding) over [supabase edge functions](https://supabase.com/edge-functions).

The chart page is at the root of the repo ([here](https://github.com/cysabi/tracking-the-line/blob/main/chart.html)), and is just served with github pages.

---

*empathy included • [**@cysabi**](https://github.com/cysabi) • [cysabi.github.io](https://cysabi.github.io)*
