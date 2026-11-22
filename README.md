# Website availability monitor

Checks https://blitz-career.vercel.app/api/health twice an hour using standard GitHub-hosted Linux runners. Sends Telegram alerts on outages and recovery; healthy checks stay silent. Scheduled runs may be delayed by GitHub.

This public repository contains only the generic monitoring script and workflow. Application source, submissions and credentials are not included. Configure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_IDS as encrypted repository Actions secrets. Two recipients must first start the bot.

The last status is cached to reduce duplicate alerts. Cache loss can cause a repeat outage alert. The workflow supports a manual, clearly labeled setup notification. Action versions are pinned to commit hashes. No packages are installed by the monitoring job.

A small weekly availability record keeps an operational history and maintains repository activity. GitHub disables scheduled workflows in public repositories after 60 days without repository activity. This step uses only the built-in repository token and publishes status and timestamps, never Telegram recipients or credentials.
