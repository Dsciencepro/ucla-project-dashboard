// api.js — FAST database API routes v1.0
const express = require('express');
const { query } = require('./db');
const router = express.Router();

// ─── GET /api/dashboard — Main overview aggregates ──────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COUNT(DISTINCT p.Id) AS totalProjects,
        ISNULL(SUM(p.EstimatedAmount), 0) AS totalBudget,
        (SELECT COUNT(*) FROM WorkOrders) AS totalWorkOrders,
        (SELECT ISNULL(SUM(CAST(
          CASE WHEN ISNUMERIC(t.Hours) = 1 THEN t.Hours ELSE '0' END AS float
        )), 0) FROM EmployeeTimesheets t) AS totalHoursLogged,
        (SELECT COUNT(DISTINCT EmployeeId) FROM EmployeeTimesheets) AS activeEmployees
      FROM ACUM_Project p
      WHERE p.IsArchived = 0
    `);
    res.json(result.recordset[0]);
  } catch (e) {
    console.error('Dashboard error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/projects — All active projects with budget + hours ────────────
router.get('/projects', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        p.Id, p.ProjectNo, p.ProjectCode, p.Name, p.Status,
        p.EstimatedAmount AS Budget,
        p.StartDate, p.EndDate,
        p.ProjectManager, p.TQFPM,
        p.IsTM, p.IsArchived,
        c.Name AS CustomerName,
        c.CustomerCD,
        -- Budget from task items
        ISNULL(budget.TotalBudget, 0) AS TaskBudget,
        ISNULL(budget.TaskCount, 0) AS TaskCount,
        -- Hours from timesheets via work orders
        ISNULL(hrs.TotalHours, 0) AS HoursLogged,
        ISNULL(hrs.RegularHours, 0) AS RegularHours,
        ISNULL(hrs.OvertimeHours, 0) AS OvertimeHours,
        ISNULL(hrs.TimesheetCount, 0) AS TimesheetEntries,
        -- Work order counts
        ISNULL(wo.WOCount, 0) AS WorkOrderCount,
        ISNULL(wo.CompletedWO, 0) AS CompletedWorkOrders
      FROM ACUM_Project p
      LEFT JOIN ACUM_Customer c ON p.CustomerId = c.Id
      -- Budget aggregation
      LEFT JOIN (
        SELECT pt.ProjectId,
          SUM(pti.BasePrice * pti.Quantity) AS TotalBudget,
          COUNT(DISTINCT pt.Id) AS TaskCount
        FROM ACUM_ProjectTask pt
        JOIN ACUM_ProjectTaskItems pti ON pt.Id = pti.TaskId
        WHERE pt.IsArchived = 0
        GROUP BY pt.ProjectId
      ) budget ON p.Id = budget.ProjectId
      -- Hours aggregation via work orders
      LEFT JOIN (
        SELECT w.ProjectNo,
          SUM(CASE WHEN ISNUMERIC(REPLACE(REPLACE(et.Hours,':','.'),'.0000000','')) = 1 
            THEN CAST(DATEDIFF(MINUTE, et.StartTime, et.EndTime) AS float) / 60.0 
            ELSE 0 END) AS TotalHours,
          SUM(CASE WHEN et.Type = 'Regular' 
            THEN CAST(DATEDIFF(MINUTE, et.StartTime, et.EndTime) AS float) / 60.0 
            ELSE 0 END) AS RegularHours,
          SUM(CASE WHEN et.Type = 'Over Time' 
            THEN CAST(DATEDIFF(MINUTE, et.StartTime, et.EndTime) AS float) / 60.0 
            ELSE 0 END) AS OvertimeHours,
          COUNT(*) AS TimesheetCount
        FROM WorkOrders w
        JOIN EmployeeTimesheets et ON w.Id = et.WoId
        GROUP BY w.ProjectNo
      ) hrs ON p.ProjectNo = hrs.ProjectNo
      -- Work order counts
      LEFT JOIN (
        SELECT ProjectNo,
          COUNT(*) AS WOCount,
          SUM(CASE WHEN Status = 'Completed' THEN 1 ELSE 0 END) AS CompletedWO
        FROM WorkOrders
        GROUP BY ProjectNo
      ) wo ON p.ProjectNo = wo.ProjectNo
      WHERE p.IsArchived = 0
      ORDER BY p.Id DESC
    `);
    res.json(result.recordset);
  } catch (e) {
    console.error('Projects error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/projects/:id — Single project detail ──────────────────────────
router.get('/projects/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        p.*, c.Name AS CustomerName, c.CustomerCD
      FROM ACUM_Project p
      LEFT JOIN ACUM_Customer c ON p.CustomerId = c.Id
      WHERE p.Id = @id
    `, { id: parseInt(req.params.id) });

    if (!result.recordset.length) return res.status(404).json({ error: 'Project not found' });

    // Get tasks
    const tasks = await query(`
      SELECT pt.Id, pt.TaskCode, pt.Description, pt.Status,
        ISNULL(SUM(pti.BasePrice * pti.Quantity), 0) AS TaskBudget,
        COUNT(pti.Id) AS ItemCount
      FROM ACUM_ProjectTask pt
      LEFT JOIN ACUM_ProjectTaskItems pti ON pt.Id = pti.TaskId
      WHERE pt.ProjectId = @id AND pt.IsArchived = 0
      GROUP BY pt.Id, pt.TaskCode, pt.Description, pt.Status
      ORDER BY pt.TaskCode
    `, { id: parseInt(req.params.id) });

    // Get monthly hours
    const project = result.recordset[0];
    const monthly = await query(`
      SELECT 
        FORMAT(et.TimesheetDate, 'yyyy-MM') AS Month,
        SUM(CAST(DATEDIFF(MINUTE, et.StartTime, et.EndTime) AS float) / 60.0) AS Hours,
        COUNT(*) AS Entries,
        SUM(CASE WHEN et.Type = 'Over Time' THEN CAST(DATEDIFF(MINUTE, et.StartTime, et.EndTime) AS float) / 60.0 ELSE 0 END) AS OTHours
      FROM WorkOrders w
      JOIN EmployeeTimesheets et ON w.Id = et.WoId
      WHERE w.ProjectNo = @projNo
      GROUP BY FORMAT(et.TimesheetDate, 'yyyy-MM')
      ORDER BY Month
    `, { projNo: project.ProjectNo });

    res.json({ project: project, tasks: tasks.recordset, monthly: monthly.recordset });
  } catch (e) {
    console.error('Project detail error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/tasks — Task code summary ─────────────────────────────────────
router.get('/tasks', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        tc.Code, tc.Description,
        COUNT(DISTINCT pt.ProjectId) AS ProjectCount,
        COUNT(DISTINCT pt.Id) AS TaskAssignments,
        ISNULL(SUM(pti.BasePrice * pti.Quantity), 0) AS TotalBudget,
        ISNULL(SUM(pti.Quantity), 0) AS TotalQuantity
      FROM TaskCodes tc
      LEFT JOIN ACUM_ProjectTask pt ON tc.Code = pt.TaskCode AND pt.IsArchived = 0
      LEFT JOIN ACUM_ProjectTaskItems pti ON pt.Id = pti.TaskId
      WHERE tc.IsArchived = 0
      GROUP BY tc.Id, tc.Code, tc.Description
      ORDER BY tc.Code
    `);
    res.json(result.recordset);
  } catch (e) {
    console.error('Tasks error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/workorders — Work order summary ──────────────────────────────
router.get('/workorders', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        w.Id, w.JobDate, w.ProjectNo, w.ProjectName,
        w.WorkOrderNo, w.Status, w.TaskName,
        w.UserName AS Inspector, w.TaskDate,
        ISNULL(hrs.TotalHours, 0) AS Hours,
        ISNULL(hrs.EntryCount, 0) AS TimesheetEntries
      FROM WorkOrders w
      LEFT JOIN (
        SELECT WoId, 
          SUM(CAST(DATEDIFF(MINUTE, StartTime, EndTime) AS float) / 60.0) AS TotalHours,
          COUNT(*) AS EntryCount
        FROM EmployeeTimesheets
        GROUP BY WoId
      ) hrs ON w.Id = hrs.WoId
      ORDER BY w.Id DESC
      OFFSET 0 ROWS FETCH NEXT 200 ONLY
    `);
    res.json(result.recordset);
  } catch (e) {
    console.error('WorkOrders error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/timesheets/monthly — Monthly hours trend ──────────────────────
router.get('/timesheets/monthly', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        FORMAT(et.TimesheetDate, 'yyyy-MM') AS Month,
        SUM(CAST(DATEDIFF(MINUTE, et.StartTime, et.EndTime) AS float) / 60.0) AS TotalHours,
        SUM(CASE WHEN et.Type = 'Regular' THEN CAST(DATEDIFF(MINUTE, et.StartTime, et.EndTime) AS float) / 60.0 ELSE 0 END) AS RegularHours,
        SUM(CASE WHEN et.Type = 'Over Time' THEN CAST(DATEDIFF(MINUTE, et.StartTime, et.EndTime) AS float) / 60.0 ELSE 0 END) AS OvertimeHours,
        COUNT(*) AS EntryCount,
        COUNT(DISTINCT et.EmployeeId) AS UniqueEmployees
      FROM EmployeeTimesheets et
      WHERE et.TimesheetDate >= DATEADD(MONTH, -12, GETDATE())
      GROUP BY FORMAT(et.TimesheetDate, 'yyyy-MM')
      ORDER BY Month
    `);
    res.json(result.recordset);
  } catch (e) {
    console.error('Timesheets monthly error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/employees — Employee/PM summary ──────────────────────────────
router.get('/employees', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        e.Id, e.Code, e.Name, e.Department,
        e.IsActive,
        ISNULL(pm.ProjectCount, 0) AS ManagedProjects,
        ISNULL(ts.TotalHours, 0) AS HoursLogged
      FROM ACUM_Employee e
      LEFT JOIN (
        SELECT ProjectManager, COUNT(*) AS ProjectCount
        FROM ACUM_Project WHERE IsArchived = 0
        GROUP BY ProjectManager
      ) pm ON e.Name = pm.ProjectManager
      LEFT JOIN (
        SELECT EmployeeId,
          SUM(CAST(DATEDIFF(MINUTE, StartTime, EndTime) AS float) / 60.0) AS TotalHours
        FROM EmployeeTimesheets
        WHERE TimesheetDate >= DATEADD(MONTH, -6, GETDATE())
        GROUP BY EmployeeId
      ) ts ON e.Id = ts.EmployeeId
      WHERE e.IsActive = 1
      ORDER BY e.Name
    `);
    res.json(result.recordset);
  } catch (e) {
    console.error('Employees error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/customers — Customer summary ─────────────────────────────────
router.get('/customers', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        c.Id, c.CustomerCD, c.Name, c.CustomerClass, c.City, c.State,
        ISNULL(proj.ProjectCount, 0) AS ProjectCount,
        ISNULL(proj.TotalBudget, 0) AS TotalBudget
      FROM ACUM_Customer c
      LEFT JOIN (
        SELECT CustomerId, COUNT(*) AS ProjectCount, SUM(EstimatedAmount) AS TotalBudget
        FROM ACUM_Project WHERE IsArchived = 0
        GROUP BY CustomerId
      ) proj ON c.Id = proj.CustomerId
      WHERE c.IsArchived = 0
      ORDER BY proj.ProjectCount DESC
    `);
    res.json(result.recordset);
  } catch (e) {
    console.error('Customers error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
