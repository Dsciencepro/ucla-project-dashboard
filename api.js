// api.js — v2.0 FAST + AcumaticaDB combined API
const express = require('express');
const { query } = require('./db');
const router = express.Router();

// ─── Dashboard KPIs (AcumaticaDB financials + FAST hours) ──────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        (SELECT COUNT(*) FROM AcumaticaDB.dbo.Contract WHERE NonProject=0 AND IsTemplate=0 AND DeletedDatabaseRecord=0) AS totalProjects,
        (SELECT ISNULL(SUM(CuryRevisedAmount),0) FROM AcumaticaDB.dbo.PMBudget WHERE Type='R') AS totalRevisedBudget,
        (SELECT ISNULL(SUM(CuryActualAmount),0) FROM AcumaticaDB.dbo.PMBudget WHERE Type='E') AS totalActualCost,
        (SELECT ISNULL(SUM(CuryCommittedAmount),0) FROM AcumaticaDB.dbo.PMBudget WHERE Type='E') AS totalCommitted,
        (SELECT ISNULL(SUM(CuryInvoicedAmount),0) FROM AcumaticaDB.dbo.PMBudget WHERE Type='R') AS totalInvoiced,
        (SELECT ISNULL(SUM(CuryChangeOrderAmount),0) FROM AcumaticaDB.dbo.PMBudget) AS totalChangeOrders,
        (SELECT COUNT(*) FROM FAST.dbo.WorkOrders) AS totalWorkOrders,
        (SELECT ISNULL(SUM(CAST(DATEDIFF(MINUTE,StartTime,EndTime) AS float)/60.0),0) FROM FAST.dbo.EmployeeTimesheets) AS totalHoursLogged,
        (SELECT COUNT(DISTINCT EmployeeId) FROM FAST.dbo.EmployeeTimesheets) AS activeEmployees,
        (SELECT COUNT(*) FROM AcumaticaDB.dbo.PMChangeOrder WHERE Released=1) AS releasedChangeOrders,
        (SELECT COUNT(*) FROM AcumaticaDB.dbo.PMProforma WHERE Released=1) AS releasedProformas
    `);
    res.json(result.recordset[0]);
  } catch (e) { console.error('Dashboard error:', e.message); res.status(500).json({ error: e.message }); }
});

// ─── Projects with full financials ──────────────────────────────────────────
router.get('/projects', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        c.ContractID AS Id, c.ContractCD AS ProjectNo, c.Description AS Name,
        c.Status, c.StartDate, c.ExpireDate AS EndDate,
        c.CertifiedJob, c.ChangeOrderWorkflow,
        cust.AcctName AS CustomerName, cust.AcctCD AS CustomerCD,
        -- Revenue budget
        ISNULL(rev.RevisedBudget, 0) AS RevisedBudget,
        ISNULL(rev.OriginalBudget, 0) AS OriginalBudget,
        ISNULL(rev.InvoicedAmount, 0) AS InvoicedAmount,
        ISNULL(rev.ChangeOrderAmt, 0) AS ChangeOrderAmount,
        -- Cost budget
        ISNULL(cost.ActualCost, 0) AS ActualCost,
        ISNULL(cost.CommittedCost, 0) AS CommittedCost,
        ISNULL(cost.CostBudget, 0) AS CostBudget,
        ISNULL(cost.CostChangeOrders, 0) AS CostChangeOrders,
        -- Computed
        ISNULL(rev.RevisedBudget, 0) - ISNULL(rev.InvoicedAmount, 0) AS RemainingRevenue,
        ISNULL(cost.CostBudget, 0) - ISNULL(cost.ActualCost, 0) - ISNULL(cost.CommittedCost, 0) AS RemainingCost,
        CASE WHEN ISNULL(rev.RevisedBudget, 0) > 0
          THEN ISNULL(rev.InvoicedAmount, 0) / rev.RevisedBudget * 100 ELSE 0 END AS BilledPct,
        CASE WHEN ISNULL(cost.CostBudget, 0) > 0
          THEN (ISNULL(cost.ActualCost, 0) + ISNULL(cost.CommittedCost, 0)) / cost.CostBudget * 100 ELSE 0 END AS CostUtilPct,
        -- FAST hours
        ISNULL(hrs.HoursLogged, 0) AS HoursLogged,
        ISNULL(hrs.RegularHours, 0) AS RegularHours,
        ISNULL(hrs.OvertimeHours, 0) AS OvertimeHours,
        ISNULL(hrs.TimesheetEntries, 0) AS TimesheetEntries,
        ISNULL(wo.WOCount, 0) AS WorkOrderCount,
        ISNULL(wo.CompletedWO, 0) AS CompletedWorkOrders
      FROM AcumaticaDB.dbo.Contract c
      LEFT JOIN AcumaticaDB.dbo.BAccount cust ON c.CustomerID = cust.BAccountID
      -- Revenue aggregation
      LEFT JOIN (
        SELECT ProjectID,
          SUM(CuryAmount) AS OriginalBudget,
          SUM(CuryRevisedAmount) AS RevisedBudget,
          SUM(CuryInvoicedAmount) AS InvoicedAmount,
          SUM(CuryChangeOrderAmount) AS ChangeOrderAmt
        FROM AcumaticaDB.dbo.PMBudget WHERE Type = 'R'
        GROUP BY ProjectID
      ) rev ON c.ContractID = rev.ProjectID
      -- Cost aggregation
      LEFT JOIN (
        SELECT ProjectID,
          SUM(CuryRevisedAmount) AS CostBudget,
          SUM(CuryActualAmount) AS ActualCost,
          SUM(CuryCommittedAmount) AS CommittedCost,
          SUM(CuryChangeOrderAmount) AS CostChangeOrders
        FROM AcumaticaDB.dbo.PMBudget WHERE Type = 'E'
        GROUP BY ProjectID
      ) cost ON c.ContractID = cost.ProjectID
      -- FAST hours via project number
      LEFT JOIN (
        SELECT w.ProjectNo,
          SUM(CAST(DATEDIFF(MINUTE,et.StartTime,et.EndTime) AS float)/60.0) AS HoursLogged,
          SUM(CASE WHEN et.Type='Regular' THEN CAST(DATEDIFF(MINUTE,et.StartTime,et.EndTime) AS float)/60.0 ELSE 0 END) AS RegularHours,
          SUM(CASE WHEN et.Type='Over Time' THEN CAST(DATEDIFF(MINUTE,et.StartTime,et.EndTime) AS float)/60.0 ELSE 0 END) AS OvertimeHours,
          COUNT(*) AS TimesheetEntries
        FROM FAST.dbo.WorkOrders w
        JOIN FAST.dbo.EmployeeTimesheets et ON w.Id = et.WoId
        GROUP BY w.ProjectNo
      ) hrs ON c.ContractCD = hrs.ProjectNo
      -- Work orders
      LEFT JOIN (
        SELECT ProjectNo, COUNT(*) AS WOCount,
          SUM(CASE WHEN Status='Completed' THEN 1 ELSE 0 END) AS CompletedWO
        FROM FAST.dbo.WorkOrders GROUP BY ProjectNo
      ) wo ON c.ContractCD = wo.ProjectNo
      WHERE c.NonProject = 0 AND c.IsTemplate = 0 AND c.DeletedDatabaseRecord = 0
      ORDER BY c.ContractID DESC
    `);
    res.json(result.recordset);
  } catch (e) { console.error('Projects error:', e.message); res.status(500).json({ error: e.message }); }
});

// ─── Single Project Detail ──────────────────────────────────────────────────
router.get('/projects/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // Project
    const proj = await query(`
      SELECT c.*, cust.AcctName AS CustomerName FROM AcumaticaDB.dbo.Contract c
      LEFT JOIN AcumaticaDB.dbo.BAccount cust ON c.CustomerID = cust.BAccountID
      WHERE c.ContractID = @id
    `, { id });
    if (!proj.recordset.length) return res.status(404).json({ error: 'Not found' });

    // Tasks
    const tasks = await query(`
      SELECT t.TaskCD, t.Description, t.Status, t.CompletedPercent,
        ISNULL(b.RevBudget,0) AS RevenueBudget, ISNULL(b.CostBudget,0) AS CostBudget,
        ISNULL(b.ActualCost,0) AS ActualCost, ISNULL(b.Invoiced,0) AS Invoiced
      FROM AcumaticaDB.dbo.PMTask t
      LEFT JOIN (
        SELECT ProjectTaskID,
          SUM(CASE WHEN Type='R' THEN CuryRevisedAmount ELSE 0 END) AS RevBudget,
          SUM(CASE WHEN Type='E' THEN CuryRevisedAmount ELSE 0 END) AS CostBudget,
          SUM(CASE WHEN Type='E' THEN CuryActualAmount ELSE 0 END) AS ActualCost,
          SUM(CASE WHEN Type='R' THEN CuryInvoicedAmount ELSE 0 END) AS Invoiced
        FROM AcumaticaDB.dbo.PMBudget WHERE ProjectID = @id GROUP BY ProjectTaskID
      ) b ON t.TaskID = b.ProjectTaskID AND t.ProjectID = @id
      WHERE t.ProjectID = @id ORDER BY t.TaskCD
    `, { id });

    // Change Orders
    const cos = await query(`
      SELECT RefNbr, Description, Status, Date, CostTotal, RevenueTotal, CommitmentTotal
      FROM AcumaticaDB.dbo.PMChangeOrder WHERE ProjectID = @id ORDER BY Date DESC
    `, { id });

    // Monthly actuals from PMHistory
    const monthly = await query(`
      SELECT PeriodID, SUM(FinPTDAmount) AS Amount, SUM(FinPTDQty) AS Qty
      FROM AcumaticaDB.dbo.PMHistory WHERE ProjectID = @id
      GROUP BY PeriodID ORDER BY PeriodID
    `, { id });

    // Proformas
    const proformas = await query(`
      SELECT RefNbr, Description, Status, InvoiceDate, CuryDocTotal AS Total, Released
      FROM AcumaticaDB.dbo.PMProforma WHERE ProjectID = @id ORDER BY InvoiceDate DESC
    `, { id });

    res.json({
      project: proj.recordset[0], tasks: tasks.recordset,
      changeOrders: cos.recordset, monthly: monthly.recordset,
      proformas: proformas.recordset,
    });
  } catch (e) { console.error('Project detail error:', e.message); res.status(500).json({ error: e.message }); }
});

// ─── Tasks ──────────────────────────────────────────────────────────────────
router.get('/tasks', async (req, res) => {
  try {
    const result = await query(`
      SELECT t.TaskCD AS Code, t.Description,
        COUNT(DISTINCT t.ProjectID) AS ProjectCount,
        SUM(CASE WHEN b.Type='R' THEN b.CuryRevisedAmount ELSE 0 END) AS RevenueBudget,
        SUM(CASE WHEN b.Type='E' THEN b.CuryRevisedAmount ELSE 0 END) AS CostBudget,
        SUM(CASE WHEN b.Type='E' THEN b.CuryActualAmount ELSE 0 END) AS ActualCost,
        SUM(CASE WHEN b.Type='R' THEN b.CuryInvoicedAmount ELSE 0 END) AS Invoiced
      FROM AcumaticaDB.dbo.PMTask t
      LEFT JOIN AcumaticaDB.dbo.PMBudget b ON t.ProjectID = b.ProjectID AND t.TaskID = b.ProjectTaskID
      JOIN AcumaticaDB.dbo.Contract c ON t.ProjectID = c.ContractID
      WHERE c.NonProject = 0 AND c.IsTemplate = 0 AND c.DeletedDatabaseRecord = 0
      GROUP BY t.TaskCD, t.Description
      ORDER BY t.TaskCD
    `);
    res.json(result.recordset);
  } catch (e) { console.error('Tasks error:', e.message); res.status(500).json({ error: e.message }); }
});

// ─── Work Orders ────────────────────────────────────────────────────────────
router.get('/workorders', async (req, res) => {
  try {
    const result = await query(`
      SELECT TOP 200 w.Id, w.JobDate, w.ProjectNo, w.ProjectName,
        w.WorkOrderNo, w.Status, w.TaskName, w.UserName AS Inspector, w.TaskDate,
        ISNULL(hrs.TotalHours, 0) AS Hours, ISNULL(hrs.EntryCount, 0) AS TimesheetEntries
      FROM FAST.dbo.WorkOrders w
      LEFT JOIN (SELECT WoId, SUM(CAST(DATEDIFF(MINUTE,StartTime,EndTime) AS float)/60.0) AS TotalHours, COUNT(*) AS EntryCount
        FROM FAST.dbo.EmployeeTimesheets GROUP BY WoId) hrs ON w.Id = hrs.WoId
      ORDER BY w.Id DESC
    `);
    res.json(result.recordset);
  } catch (e) { console.error('WorkOrders error:', e.message); res.status(500).json({ error: e.message }); }
});

// ─── Monthly Timesheets ─────────────────────────────────────────────────────
router.get('/timesheets/monthly', async (req, res) => {
  try {
    const result = await query(`
      SELECT FORMAT(et.TimesheetDate,'yyyy-MM') AS Month,
        SUM(CAST(DATEDIFF(MINUTE,et.StartTime,et.EndTime) AS float)/60.0) AS TotalHours,
        SUM(CASE WHEN et.Type='Regular' THEN CAST(DATEDIFF(MINUTE,et.StartTime,et.EndTime) AS float)/60.0 ELSE 0 END) AS RegularHours,
        SUM(CASE WHEN et.Type='Over Time' THEN CAST(DATEDIFF(MINUTE,et.StartTime,et.EndTime) AS float)/60.0 ELSE 0 END) AS OvertimeHours,
        COUNT(*) AS EntryCount, COUNT(DISTINCT et.EmployeeId) AS UniqueEmployees
      FROM FAST.dbo.EmployeeTimesheets et
      WHERE et.TimesheetDate >= DATEADD(MONTH,-12,GETDATE())
      GROUP BY FORMAT(et.TimesheetDate,'yyyy-MM') ORDER BY Month
    `);
    res.json(result.recordset);
  } catch (e) { console.error('Timesheets error:', e.message); res.status(500).json({ error: e.message }); }
});

// ─── Change Orders ──────────────────────────────────────────────────────────
router.get('/changeorders', async (req, res) => {
  try {
    const result = await query(`
      SELECT co.RefNbr, co.Description, co.Status, co.Date, co.Released,
        co.CostTotal, co.RevenueTotal, co.CommitmentTotal,
        c.ContractCD AS ProjectNo, c.Description AS ProjectName
      FROM AcumaticaDB.dbo.PMChangeOrder co
      JOIN AcumaticaDB.dbo.Contract c ON co.ProjectID = c.ContractID
      ORDER BY co.Date DESC
    `);
    res.json(result.recordset);
  } catch (e) { console.error('Change orders error:', e.message); res.status(500).json({ error: e.message }); }
});

// ─── Monthly Financial History (from PMHistory) ─────────────────────────────
router.get('/financial/monthly', async (req, res) => {
  try {
    const result = await query(`
      SELECT LEFT(h.PeriodID, 4) + '-' + RIGHT(h.PeriodID, 2) AS Month,
        SUM(h.FinPTDAmount) AS Amount, SUM(h.FinPTDQty) AS Qty
      FROM AcumaticaDB.dbo.PMHistory h
      JOIN AcumaticaDB.dbo.Contract c ON h.ProjectID = c.ContractID
      WHERE c.NonProject = 0 AND c.IsTemplate = 0 AND c.DeletedDatabaseRecord = 0
        AND h.PeriodID >= FORMAT(DATEADD(MONTH,-12,GETDATE()),'yyyyMM')
      GROUP BY h.PeriodID ORDER BY h.PeriodID
    `);
    res.json(result.recordset);
  } catch (e) { console.error('Financial monthly error:', e.message); res.status(500).json({ error: e.message }); }
});

module.exports = router;
