


    const narrative = `Between ${new Date(report.firstActivity!).toLocaleDateString()} and ${new Date(report.lastActivity!).toLocaleDateString()}, the parent engaged in ${report.totalSessions} interactive sessions using the BONDING educational chemistry application. During these sessions, ${report.totalMoleculesBuilt} molecules were collaboratively built with the children, including ${report.scientificNames.slice(0,3).join(", ")}. ${report.totalPingsSent + report.totalPingsReceived} affirmation signals (pings) and ${report.totalMessagesExchanged} text messages were exchanged across devices. The parent's average response time to child interactions was ${report.averagePingResponseTime}. All activity was logged with timestamps and is independently verifiable.`;

