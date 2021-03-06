SET QUOTED_IDENTIFIER ON 
GO
SET ANSI_NULLS ON 
GO

CREATE OR ALTER PROCEDURE [dbo].[DeleteProduct] (
	@ID Varchar(50) = NULL
	)
AS
BEGIN
	SET NOCOUNT ON
	
	DELETE FROM [Product]
	WHERE [ID] = @ID

    SELECT 1 AS 'result'
    
    SET NOCOUNT OFF
END

GO
SET QUOTED_IDENTIFIER OFF 
GO
SET ANSI_NULLS OFF 
GO

GO
