// consultas.js
export const queries = {
  ventas_por_cliente: `
    SELECT c.CustomerID,
           c.FirstName + ' ' + c.LastName AS Cliente,
           COUNT(soh.SalesOrderID) AS TotalPedidos,
           SUM(soh.TotalDue) AS TotalGastado
    FROM SalesLT.Customer c
    JOIN SalesLT.SalesOrderHeader soh ON c.CustomerID = soh.CustomerID
    GROUP BY c.CustomerID, c.FirstName, c.LastName
    ORDER BY TotalGastado DESC;
  `,

  ventas_por_producto: `
    SELECT p.ProductID,
           p.Name AS Producto,
           SUM(sod.OrderQty) AS CantidadVendida,
           SUM(sod.LineTotal) AS TotalVenta
    FROM SalesLT.SalesOrderDetail sod
    JOIN SalesLT.Product p ON sod.ProductID = p.ProductID
    GROUP BY p.ProductID, p.Name
    ORDER BY TotalVenta DESC;
  `,

  ventas_por_categoria: `
    SELECT pc.ProductCategoryID,
           pc.Name AS Categoria,
           SUM(sod.LineTotal) AS TotalVenta
    FROM SalesLT.SalesOrderDetail sod
    JOIN SalesLT.Product p ON sod.ProductID = p.ProductID
    JOIN SalesLT.ProductCategory pc ON p.ProductCategoryID = pc.ProductCategoryID
    GROUP BY pc.ProductCategoryID, pc.Name
    ORDER BY TotalVenta DESC;
  `,

  clientes_mas_pedidos: `
    SELECT c.CustomerID,
           c.FirstName + ' ' + c.LastName AS Cliente,
           COUNT(soh.SalesOrderID) AS PedidosRealizados
    FROM SalesLT.Customer c
    JOIN SalesLT.SalesOrderHeader soh ON c.CustomerID = soh.CustomerID
    GROUP BY c.CustomerID, c.FirstName, c.LastName
    ORDER BY PedidosRealizados DESC;
  `,

  promedio_valor_pedido: `
    SELECT AVG(soh.TotalDue) AS PromedioValorPedido
    FROM SalesLT.SalesOrderHeader soh;
  `,

  productos_sin_ventas: `
    SELECT p.ProductID,
           p.Name AS Producto
    FROM SalesLT.Product p
    LEFT JOIN SalesLT.SalesOrderDetail sod ON p.ProductID = sod.ProductID
    WHERE sod.ProductID IS NULL;
  `,

  ventas_por_anio: `
    SELECT YEAR(soh.OrderDate) AS Año,
           SUM(soh.TotalDue) AS TotalVenta
    FROM SalesLT.SalesOrderHeader soh
    GROUP BY YEAR(soh.OrderDate)
    ORDER BY Año;
  `,

  nuevos_clientes_ultimo_ano: `
    SELECT COUNT(DISTINCT c.CustomerID) AS NuevosClientesUltimoAno
    FROM SalesLT.Customer c
    JOIN SalesLT.SalesOrderHeader soh ON c.CustomerID = soh.CustomerID
    WHERE soh.OrderDate >= DATEADD(year, -1, GETDATE());
  `,

  ventas_por_direccion: `
    SELECT a.AddressLine1, a.City, a.StateProvince, a.PostalCode, a.CountryRegion,
           SUM(soh.TotalDue) AS TotalVenta
    FROM SalesLT.Address a
    JOIN SalesLT.CustomerAddress ca ON a.AddressID = ca.AddressID
    JOIN SalesLT.Customer c ON ca.CustomerID = c.CustomerID
    JOIN SalesLT.SalesOrderHeader soh ON c.CustomerID = soh.CustomerID
    GROUP BY a.AddressLine1, a.City, a.StateProvince, a.PostalCode, a.CountryRegion
    ORDER BY TotalVenta DESC;
  `,

  clientes_ticket_promedio: `
    SELECT c.CustomerID,
           c.FirstName + ' ' + c.LastName AS Cliente,
           AVG(soh.TotalDue) AS TicketPromedio
    FROM SalesLT.Customer c
    JOIN SalesLT.SalesOrderHeader soh ON c.CustomerID = soh.CustomerID
    GROUP BY c.CustomerID, c.FirstName, c.LastName
    ORDER BY TicketPromedio DESC;
  `,

  numero_productos_por_categoria: `
    SELECT pc.ProductCategoryID, pc.Name,
           COUNT(p.ProductID) AS NumeroProductos
    FROM SalesLT.ProductCategory pc
    JOIN SalesLT.Product p ON p.ProductCategoryID = pc.ProductCategoryID
    GROUP BY pc.ProductCategoryID, pc.Name
    ORDER BY NumeroProductos DESC;
  `,

  ventas_por_modelo_producto: `
    SELECT pm.ProductModelID, pm.Name,
           SUM(sod.LineTotal) AS TotalVenta
    FROM SalesLT.ProductModel pm
    JOIN SalesLT.ProductModelProductDescription pmpd ON pm.ProductModelID = pmpd.ProductModelID
    JOIN SalesLT.Product p ON p.ProductModelID = pm.ProductModelID
    JOIN SalesLT.SalesOrderDetail sod ON p.ProductID = sod.ProductID
    GROUP BY pm.ProductModelID, pm.Name
    ORDER BY TotalVenta DESC;
  `,

  clientes_inactivos: `
    SELECT c.CustomerID,
           c.FirstName + ' ' + c.LastName AS Cliente,
           MAX(soh.OrderDate) AS UltimoPedido
    FROM SalesLT.Customer c
    LEFT JOIN SalesLT.SalesOrderHeader soh ON c.CustomerID = soh.CustomerID
    GROUP BY c.CustomerID, c.FirstName, c.LastName
    HAVING MAX(soh.OrderDate) < DATEADD(month, -6, GETDATE()) OR MAX(soh.OrderDate) IS NULL
    ORDER BY UltimoPedido;
  `,

  promedio_dias_envio: `
    SELECT 
        soh.SalesOrderID,
        DATEDIFF(day, soh.OrderDate, soh.ShipDate) AS DiasParaEnvio
    FROM SalesLT.SalesOrderHeader soh
    WHERE soh.ShipDate IS NOT NULL;
  `,

  porcentaje_ordenes_estado: `
    SELECT 
        soh.Status,
        COUNT(*) AS TotalOrdenes,
        CAST(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM SalesLT.SalesOrderHeader) AS DECIMAL(5,2)) AS Porcentaje
    FROM SalesLT.SalesOrderHeader soh
    GROUP BY soh.Status;
  `
};
