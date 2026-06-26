






      if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
        return {
          allowed: false,
          reason: `Allowed only between ${settings.schedule.allowedStart} and ${settings.schedule.allowedEnd}`
        };
      }
    }


    if (filter?.childId) {
      result = result.filter(a => a.childId === filter.childId);
    }

    if (filter?.startDate) {
      result = result.filter(a => a.timestamp >= filter.startDate!);
    }

    if (filter?.endDate) {
      result = result.filter(a => a.timestamp <= filter.endDate!);
    }

    if (filter?.actionTypes?.length) {
      result = result.filter(a => filter.actionTypes!.includes(a.actionType));
    }

}
