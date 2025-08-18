export const consulta_db = {
    prediccion_ventas: `
    SELECT
    T.ANIO,
    T.MES,
    P.NOMBRE AS Producto,
    S.NOMSUC AS Sucursal,
    SUM(V.CANTIDAD) AS TotalCantidad,
    SUM(V.SUBTOTAL) AS TotalVentas
FROM dbo.FACTVENTAS V
INNER JOIN dbo.DIMPRODUCTOS P ON V.DIMPRO = P.DIMPRO
INNER JOIN dbo.DIMSUCURSALES S ON V.DIMSUC = S.DIMSUC
INNER JOIN dbo.DIMTIEMPO T ON V.DIMTI = T.DIMTI
GROUP BY
    T.ANIO,
    T.MES,
    P.NOMBRE,
    S.NOMSUC
ORDER BY
    T.ANIO,
    T.MES;
  `,
};