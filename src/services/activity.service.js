export async function createActivity(
  tx,
  {
    userId = null,
    type,
    entityId = null,
    details = {}
  }
) {
  return tx.activityLog.create({
    data: {
      userId,
      type,
      entityId,
      details
    }
  });
}
