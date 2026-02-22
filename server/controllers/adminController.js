import { User } from '../models/User.js';
import { History } from '../models/History.js';
import { sendDeactivationEmail, sendReactivationEmail } from '../lib/email.js';

/**
 * GET /api/admin/users
 */
export async function listUsers(req, res) {
  try {
    const users = await User.find({}).sort({ createdAt: -1 }).limit(100).lean();
    return res.json({
      ok: true,
      users: users.map((u) => ({
        id: String(u._id),
        email: u.email,
        role: u.role,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        isVerified: u.isVerified,
        isActive: u.isActive !== false, // default true for older docs
        deactivationReason: u.deactivationReason || '',
        deactivatedAt: u.deactivatedAt || null,
        createdAt: u.createdAt,
      })),
    });
  } catch (e) {
    console.error('[adminController.listUsers]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

/**
 * GET /api/admin/predictions
 */
export async function listAllPredictions(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const items = await History.find({})
      .populate('userId', 'email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json({
      ok: true,
      items: items.map(item => ({
        _id: String(item._id),
        userId: String(item.userId?._id || item.userId),
        userEmail: item.userId?.email || 'Unknown',
        category: item.category,
        confidence: item.confidence,
        ratio: item.ratio,
        oilYieldPercent: item.oilYieldPercent,
        yieldCategory: item.yieldCategory,
        createdAt: item.createdAt,
      }))
    });
  } catch (e) {
    console.error('[adminController.listAllPredictions]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

/**
 * GET /api/admin/history
 */
export async function listAllHistory(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const items = await History.find({})
      .populate('userId', 'email firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json({
      ok: true,
      items: items.map(item => ({
        ...item,
        id: String(item._id),
        _id: undefined,
        userEmail: item.userId?.email || 'Unknown',
        userName: [item.userId?.firstName, item.userId?.lastName].filter(Boolean).join(' ') || null,
        userId: String(item.userId?._id || item.userId),
      }))
    });
  } catch (e) {
    console.error('[adminController.listAllHistory]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

/**
 * PUT /api/admin/users/:id
 * Update a user's role or profile fields.
 */
export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { role, firstName, lastName } = req.body;

    // Prevent admin from demoting themselves
    if (id === String(req.auth.userId) && role && role !== req.auth.role) {
      return res.status(400).json({ ok: false, error: 'cannot_change_own_role' });
    }

    const update = {};
    if (role && ['user', 'admin'].includes(role)) update.role = role;
    if (firstName !== undefined) update.firstName = firstName;
    if (lastName !== undefined) update.lastName = lastName;

    const user = await User.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!user) return res.status(404).json({ ok: false, error: 'user_not_found' });

    return res.json({
      ok: true,
      user: {
        id: String(user._id),
        email: user.email,
        role: user.role,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (e) {
    console.error('[adminController.updateUser]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

/**
 * PATCH /api/admin/users/:id/status
 * Activate or deactivate a user (soft delete). Sends email notification on deactivation.
 */
export async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { isActive, reason } = req.body;

    // Prevent admin from deactivating themselves
    if (id === String(req.auth.userId)) {
      return res.status(400).json({ ok: false, error: 'cannot_deactivate_self' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ ok: false, error: 'user_not_found' });

    const newActive = isActive !== undefined ? Boolean(isActive) : !user.isActive;

    user.isActive = newActive;
    if (!newActive) {
      user.deactivationReason = reason || 'Account deactivated by admin';
      user.deactivatedAt = new Date();
      user.deactivatedBy = req.auth.userId;
    } else {
      user.deactivationReason = '';
      user.deactivatedAt = null;
      user.deactivatedBy = null;
    }
    await user.save();

    // Send email notification on deactivation or reactivation
    if (!newActive) {
      try {
        await sendDeactivationEmail(user.email, user.deactivationReason);
      } catch (emailErr) {
        console.error('[adminController.toggleUserStatus] deactivation email failed:', emailErr?.message);
      }
    } else {
      try {
        await sendReactivationEmail(user.email);
      } catch (emailErr) {
        console.error('[adminController.toggleUserStatus] reactivation email failed:', emailErr?.message);
      }
    }

    return res.json({
      ok: true,
      user: {
        id: String(user._id),
        email: user.email,
        role: user.role,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        isVerified: user.isVerified,
        isActive: user.isActive,
        deactivationReason: user.deactivationReason || '',
        deactivatedAt: user.deactivatedAt || null,
        createdAt: user.createdAt,
      },
      message: newActive ? 'User activated' : 'User deactivated',
    });
  } catch (e) {
    console.error('[adminController.toggleUserStatus]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

/**
 * DELETE /api/admin/history/:id
 * Delete a single history/scan record.
 */
export async function deleteHistory(req, res) {
  try {
    const { id } = req.params;
    const item = await History.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ ok: false, error: 'history_not_found' });
    return res.json({ ok: true, message: 'History record deleted' });
  } catch (e) {
    console.error('[adminController.deleteHistory]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

/**
 * GET /api/admin/analytics/overview
 * Comprehensive analytics for the Admin Dashboard.
 * All DB queries run in parallel via Promise.all for maximum speed.
 */
export async function getAnalyticsOverview(req, res) {
  try {
    /* ── Pre-compute date boundaries (used across multiple queries) ── */
    const now = new Date();

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const twelveWeeksAgo = new Date(now);
    twelveWeeksAgo.setDate(now.getDate() - 84);

    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(now.getMonth() - 12);

    const startOfMonth = new Date(now);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    /* ─────────────────────────────────────────────────────
       Run ALL DB queries in parallel — no sequential awaits.
       ~20 round-trips become 1 parallel batch.
    ───────────────────────────────────────────────────── */
    const [
      totalUsers,
      totalHistory,
      categoryDistribution,
      yieldDistribution,
      avgYieldByCategory,
      dailyActivity,
      weeklyTrend,
      monthlyTrend,
      detectionTrend,
      userActivity,
      coinDetectionStats,
      allConfidenceStats,      // merged: overall + color + oil + fruit in ONE aggregate
      confidenceDistribution,
      highConfidenceCount,
      lowConfidenceCount,
      spotStats,
      avgYieldOverall,
      dimensionStats,
      highYieldCount,
      lowYieldCount,
      newUsersThisMonth,
      scansToday,
      scansThisWeek,
      analysisTypeBreakdown,
      colorProbabilityAvgs,
      weightedAccuracy,
      recentActivity,
    ] = await Promise.all([
      /* 1  */ User.countDocuments({}),
      /* 2  */ History.countDocuments({}),

      /* 3  */ History.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      /* 4  */ History.aggregate([
        { $match: { yieldCategory: { $ne: null } } },
        { $group: { _id: '$yieldCategory', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      /* 5  */ History.aggregate([
        { $match: { oilYieldPercent: { $ne: null } } },
        {
          $group: {
            _id: '$category',
            avgYield: { $avg: '$oilYieldPercent' },
            minYield: { $min: '$oilYieldPercent' },
            maxYield: { $max: '$oilYieldPercent' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      /* 6  Daily activity — last 30 days */ History.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            greenCount:  { $sum: { $cond: [{ $eq: ['$category', 'GREEN']  }, 1, 0] } },
            yellowCount: { $sum: { $cond: [{ $eq: ['$category', 'YELLOW'] }, 1, 0] } },
            brownCount:  { $sum: { $cond: [{ $eq: ['$category', 'BROWN']  }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      /* 7  Weekly trend — 12 weeks */ History.aggregate([
        { $match: { createdAt: { $gte: twelveWeeksAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-W%V', date: '$createdAt' } },
            count: { $sum: 1 },
            avgYield: { $avg: '$oilYieldPercent' },
            avgConfidence: { $avg: '$confidence' },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      /* 8  Monthly trend — 12 months */ History.aggregate([
        { $match: { createdAt: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
            greenCount:  { $sum: { $cond: [{ $eq: ['$category', 'GREEN']  }, 1, 0] } },
            yellowCount: { $sum: { $cond: [{ $eq: ['$category', 'YELLOW'] }, 1, 0] } },
            brownCount:  { $sum: { $cond: [{ $eq: ['$category', 'BROWN']  }, 1, 0] } },
            avgYield: { $avg: '$oilYieldPercent' },
            avgConfidence: { $avg: '$confidence' },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      /* 9  Detection trend — 30 days */ History.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              category: '$category',
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.date': 1 } },
      ]),

      /* 10 User activity top-10 */ History.aggregate([
        { $group: { _id: '$userId', scanCount: { $sum: 1 }, lastScan: { $max: '$createdAt' } } },
        { $sort: { scanCount: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            userId: '$_id', email: '$user.email',
            firstName: '$user.firstName', lastName: '$user.lastName',
            scanCount: 1, lastScan: 1,
          },
        },
      ]),

      /* 11 Coin detection */ History.aggregate([
        {
          $group: {
            _id: null,
            totalScans: { $sum: 1 },
            withCoin: { $sum: { $cond: ['$referenceDetected', 1, 0] } },
          },
        },
      ]),

      /* 12 All confidence stats in ONE aggregate (replaces 4 separate queries) */
      History.aggregate([
        {
          $group: {
            _id: null,
            avgConfidence:      { $avg: '$confidence' },
            minConfidence:      { $min: '$confidence' },
            maxConfidence:      { $max: '$confidence' },
            confCount:          { $sum: { $cond: [{ $ne: ['$confidence', null] }, 1, 0] } },
            avgColorConfidence: { $avg: '$colorConfidence' },
            minColorConfidence: { $min: '$colorConfidence' },
            maxColorConfidence: { $max: '$colorConfidence' },
            avgOilConfidence:   { $avg: '$oilConfidence' },
            minOilConfidence:   { $min: '$oilConfidence' },
            maxOilConfidence:   { $max: '$oilConfidence' },
            avgFruitConfidence: { $avg: '$fruitConfidence' },
            minFruitConfidence: { $min: '$fruitConfidence' },
            maxFruitConfidence: { $max: '$fruitConfidence' },
          },
        },
      ]),

      /* 13 Confidence distribution buckets */ History.aggregate([
        { $match: { confidence: { $ne: null } } },
        {
          $bucket: {
            groupBy: '$confidence',
            boundaries: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.01],
            default: 'other',
            output: { count: { $sum: 1 } },
          },
        },
      ]),

      /* 14 */ History.countDocuments({ confidence: { $gte: 0.8 } }),
      /* 15 */ History.countDocuments({ confidence: { $lt: 0.5, $ne: null } }),

      /* 16 Spot stats */ History.aggregate([
        {
          $group: {
            _id: null,
            totalScans: { $sum: 1 },
            withSpots: { $sum: { $cond: ['$hasSpots', 1, 0] } },
            avgSpotCoverage: { $avg: { $cond: ['$hasSpots', '$spotCoverage', null] } },
          },
        },
      ]),

      /* 17 Overall yield */ History.aggregate([
        { $match: { oilYieldPercent: { $ne: null } } },
        {
          $group: {
            _id: null,
            avgYield: { $avg: '$oilYieldPercent' },
            minYield: { $min: '$oilYieldPercent' },
            maxYield: { $max: '$oilYieldPercent' },
          },
        },
      ]),

      /* 18 Dimension stats */ History.aggregate([
        { $match: { 'dimensions.lengthCm': { $ne: null } } },
        {
          $group: {
            _id: '$category',
            avgLength:       { $avg: '$dimensions.lengthCm' },
            avgWidth:        { $avg: '$dimensions.widthCm' },
            avgWeight:       { $avg: '$dimensions.wholeFruitWeightG' },
            avgKernelWeight: { $avg: '$dimensions.kernelWeightG' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      /* 19 */ History.countDocuments({ category: { $in: ['YELLOW', 'BROWN'] } }),
      /* 20 */ History.countDocuments({ category: 'GREEN' }),
      /* 21 */ User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      /* 22 */ History.countDocuments({ createdAt: { $gte: todayStart } }),
      /* 23 */ History.countDocuments({ createdAt: { $gte: weekStart } }),

      /* 24 Analysis type */ History.aggregate([
        { $group: { _id: '$analysisType', count: { $sum: 1 } } },
      ]),

      /* 25 Color probability avgs */ History.aggregate([
        { $match: { 'colorProbabilities.green': { $ne: null } } },
        {
          $group: {
            _id: null,
            avgGreenProb:  { $avg: '$colorProbabilities.green' },
            avgYellowProb: { $avg: '$colorProbabilities.yellow' },
            avgBrownProb:  { $avg: '$colorProbabilities.brown' },
          },
        },
      ]),

      /* 26 Weighted accuracy */ History.aggregate([
        {
          $match: {
            $or: [
              { colorConfidence: { $ne: null } },
              { oilConfidence:   { $ne: null } },
              { confidence:      { $ne: null } },
            ],
          },
        },
        {
          $project: {
            weighted: {
              $avg: [
                { $ifNull: ['$colorConfidence', '$confidence'] },
                { $ifNull: ['$oilConfidence',   '$confidence'] },
                { $ifNull: ['$fruitConfidence', '$confidence'] },
              ],
            },
          },
        },
        { $group: { _id: null, avgWeightedAccuracy: { $avg: '$weighted' } } },
      ]),

      /* 27 Recent activity */ History.find({})
        .populate('userId', 'email firstName lastName')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    /* ── Unpack the merged confidence stats ── */
    const cs = allConfidenceStats[0] || {};

    /* ── Build response ── */
    return res.json({
      ok: true,
      analytics: {
        overview: {
          totalUsers,
          totalHistory,
          totalPredictions: totalHistory,
          newUsersThisMonth,
          scansToday,
          scansThisWeek,
          highYieldCount,
          lowYieldCount,
        },
        categoryDistribution: categoryDistribution.reduce((acc, i) => { acc[i._id] = i.count; return acc; }, {}),
        yieldDistribution: yieldDistribution.reduce((acc, i) => { acc[i._id] = i.count; return acc; }, {}),
        avgYieldByCategory: avgYieldByCategory.reduce((acc, i) => {
          acc[i._id] = { avg: +(i.avgYield || 0).toFixed(2), min: +(i.minYield || 0).toFixed(2), max: +(i.maxYield || 0).toFixed(2), count: i.count };
          return acc;
        }, {}),
        dailyActivity,
        weeklyTrend,
        monthlyTrend,
        detectionTrend: detectionTrend.map(d => ({ date: d._id.date, category: d._id.category, count: d.count })),
        userActivity: userActivity.map(u => ({
          userId: String(u.userId), email: u.email || 'Unknown',
          name: [u.firstName, u.lastName].filter(Boolean).join(' ') || null,
          scanCount: u.scanCount, lastScan: u.lastScan,
        })),
        coinDetection: coinDetectionStats[0] || { totalScans: 0, withCoin: 0 },
        confidenceStats: {
          avgConfidence:      cs.avgConfidence      || 0,
          minConfidence:      cs.minConfidence      || 0,
          maxConfidence:      cs.maxConfidence      || 0,
          count:              cs.confCount          || 0,
          avgColorConfidence: cs.avgColorConfidence || 0,
          minColorConfidence: cs.minColorConfidence || 0,
          maxColorConfidence: cs.maxColorConfidence || 0,
          avgOilConfidence:   cs.avgOilConfidence   || 0,
          minOilConfidence:   cs.minOilConfidence   || 0,
          maxOilConfidence:   cs.maxOilConfidence   || 0,
          avgFruitConfidence: cs.avgFruitConfidence || 0,
          minFruitConfidence: cs.minFruitConfidence || 0,
          maxFruitConfidence: cs.maxFruitConfidence || 0,
          highConfidenceCount,
          lowConfidenceCount,
        },
        confidenceDistribution: confidenceDistribution.map(b => ({
          range: b._id === 'other' ? 'other' : `${Math.round(b._id * 100)}%`,
          rangeMin: b._id === 'other' ? null : b._id,
          count: b.count,
        })),
        weightedAccuracy: weightedAccuracy[0]?.avgWeightedAccuracy || 0,
        spotStats: spotStats[0] || { totalScans: 0, withSpots: 0, avgSpotCoverage: 0 },
        avgYieldOverall: avgYieldOverall[0] || { avgYield: 0, minYield: 0, maxYield: 0 },
        dimensionStats: dimensionStats.reduce((acc, i) => {
          acc[i._id] = {
            avgLength:       +((i.avgLength       || 0).toFixed(2)),
            avgWidth:        +((i.avgWidth        || 0).toFixed(2)),
            avgWeight:       +((i.avgWeight       || 0).toFixed(2)),
            avgKernelWeight: +((i.avgKernelWeight || 0).toFixed(2)),
            count: i.count,
          };
          return acc;
        }, {}),
        analysisTypeBreakdown: analysisTypeBreakdown.reduce((acc, i) => { acc[i._id || 'single'] = i.count; return acc; }, {}),
        colorProbabilityAvgs: colorProbabilityAvgs[0] || { avgGreenProb: 0, avgYellowProb: 0, avgBrownProb: 0 },
        recentActivity: recentActivity.map(item => ({
          id: String(item._id),
          userEmail: item.userId?.email || 'Unknown',
          userName: [item.userId?.firstName, item.userId?.lastName].filter(Boolean).join(' ') || null,
          category: item.category,
          confidence: item.confidence,
          oilYieldPercent: item.oilYieldPercent,
          yieldCategory: item.yieldCategory,
          analysisType: item.analysisType,
          referenceDetected: item.referenceDetected,
          hasSpots: item.hasSpots,
          createdAt: item.createdAt,
        })),
      },
    });
  } catch (e) {
    console.error('[adminController.getAnalyticsOverview]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

/**
 * GET /api/admin/analytics/charts
 */
export async function getChartData(req, res) {
  try {
    const { chartType } = req.query;

    switch (chartType) {
      case 'oilYieldTrend': {
        const data = await History.aggregate([
          { $match: { oilYieldPercent: { $ne: null } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              avgYield: { $avg: '$oilYieldPercent' },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $limit: 30 },
        ]);
        return res.json({ ok: true, data });
      }

      case 'categoryTimeline': {
        const data = await History.aggregate([
          {
            $group: {
              _id: {
                date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                category: '$category',
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.date': 1 } },
          { $limit: 100 },
        ]);
        return res.json({ ok: true, data });
      }

      case 'dimensionCorrelation': {
        const data = await History.find({
          oilYieldPercent: { $ne: null },
          'dimensions.lengthCm': { $ne: null },
        })
          .select('dimensions.lengthCm dimensions.widthCm dimensions.wholeFruitWeightG oilYieldPercent category')
          .limit(200)
          .lean();
        return res.json({ ok: true, data });
      }

      default:
        return res.status(400).json({ ok: false, error: 'invalid_chart_type' });
    }
  } catch (e) {
    console.error('[adminController.getChartData]', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}
