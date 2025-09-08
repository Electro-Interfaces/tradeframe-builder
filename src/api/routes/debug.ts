/**
 * Debug Routes - For testing trading network API
 * Provides authorized access to external API for testing tools
 */

import { Router, Request, Response } from 'express';
import { tradingNetworkAPI } from '../../services/tradingNetworkAPI';

const router = Router();

// Test endpoint - Get prices for a station
router.get('/prices/:stationNumber', async (req: Request, res: Response) => {
  try {
    const stationNumber = parseInt(req.params.stationNumber);
    const systemId = parseInt(req.query.system as string) || 15;
    const date = req.query.date as string;

    console.log(`🔧 [DEBUG] Getting prices for station ${stationNumber}, system ${systemId}`);

    const pricesData = await tradingNetworkAPI.getPrices(stationNumber, systemId, date);

    res.json({
      success: true,
      station: stationNumber,
      system: systemId,
      timestamp: new Date().toISOString(),
      ...pricesData
    });

  } catch (error) {
    console.error('❌ [DEBUG] Error getting prices:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      station: req.params.stationNumber
    });
  }
});

// Test endpoint - Get tanks/equipment data
router.get('/tanks/:stationNumber', async (req: Request, res: Response) => {
  try {
    const stationNumber = parseInt(req.params.stationNumber);
    
    console.log(`🔧 [DEBUG] Getting tanks for station ${stationNumber}`);

    // Import equipment service dynamically
    const { currentSupabaseEquipmentAPI } = await import('../../services/equipmentSupabase');
    
    // Station to UUID mapping (from tradingNetworkAPI.ts)
    const stationToUuidMapping: Record<number, string> = {
      1: '9baf5375-9929-4774-8366-c0609b9f2a51',   // АЗС №001 - Центральная
      2: 'point2',   // АЗС №002 - Северная (временно, нужен UUID) 
      3: 'f2566905-c748-4240-ac31-47b626ab625d',   // АЗС №003 - Южная
      4: 'point4',   // АЗС №004 - Московское шоссе (временно, нужен UUID)
      5: 'f7963207-2732-4fae-988e-c73eef7645ca',   // АЗС №005 - Промзона
    };
    
    const tradingPointId = stationToUuidMapping[stationNumber] || `point${stationNumber}`;
    
    const equipmentResponse = await currentSupabaseEquipmentAPI.list({
      trading_point_id: tradingPointId,
      limit: 100
    });

    // Filter for fuel tanks and extract relevant data
    const tanks = equipmentResponse.data
      .filter(eq => eq.system_type === 'fuel_tank' && eq.status !== 'deleted')
      .map(eq => ({
        id: eq.id,
        name: eq.display_name,
        tank_id: eq.id,
        capacity: eq.params?.['Объем резервуара'] || 0,
        current_level: eq.params?.['Текущий остаток'] || 0,
        fuel_type: eq.params?.['Тип топлива'] || 'Unknown',
        status: eq.status,
        params: eq.params
      }));

    res.json(tanks);

  } catch (error) {
    console.error('❌ [DEBUG] Error getting tanks:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      station: req.params.stationNumber
    });
  }
});

// Test endpoint - Get services
router.get('/services', async (req: Request, res: Response) => {
  try {
    const systemId = parseInt(req.query.system as string) || 15;
    const stationNumber = req.query.station ? parseInt(req.query.station as string) : undefined;

    console.log(`🔧 [DEBUG] Getting services for system ${systemId}, station ${stationNumber || 'all'}`);

    const services = await tradingNetworkAPI.getServices(systemId, stationNumber);

    res.json({
      success: true,
      system: systemId,
      station: stationNumber,
      timestamp: new Date().toISOString(),
      services
    });

  } catch (error) {
    console.error('❌ [DEBUG] Error getting services:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test endpoint - Set prices
router.post('/prices/:stationNumber', async (req: Request, res: Response) => {
  try {
    const stationNumber = parseInt(req.params.stationNumber);
    const systemId = parseInt(req.query.system as string) || 15;
    const { prices, effective_date } = req.body;

    console.log(`🔧 [DEBUG] Setting prices for station ${stationNumber}:`, prices);

    await tradingNetworkAPI.setPrices(stationNumber, prices, effective_date, systemId);

    res.json({
      success: true,
      message: 'Prices set successfully',
      station: stationNumber,
      system: systemId,
      prices,
      effective_date,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [DEBUG] Error setting prices:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      station: req.params.stationNumber
    });
  }
});

// Test endpoint - Login to trading network API
router.post('/login', async (req: Request, res: Response) => {
  try {
    console.log('🔧 [DEBUG] Testing trading network API login');

    const token = await tradingNetworkAPI.login();

    res.json({
      success: true,
      message: 'Login successful',
      token_length: token.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [DEBUG] Error during login:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test endpoint - Get available API methods
router.get('/methods', async (req: Request, res: Response) => {
  try {
    console.log('🔧 [DEBUG] Getting available API methods');

    const methods = await tradingNetworkAPI.getAvailableAPIMethods();

    res.json({
      success: true,
      methods,
      count: methods.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [DEBUG] Error getting API methods:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test endpoint - Full chain test
router.get('/test-chain/:stationNumber', async (req: Request, res: Response) => {
  try {
    const stationNumber = parseInt(req.params.stationNumber);
    const systemId = parseInt(req.query.system as string) || 15;

    console.log(`🔧 [DEBUG] Running full chain test for station ${stationNumber}`);

    const results: any = {
      station: stationNumber,
      system: systemId,
      timestamp: new Date().toISOString(),
      tests: {
        login: null,
        services: null,
        prices: null,
        tanks: null
      },
      errors: []
    };

    // Test 1: Login
    try {
      await tradingNetworkAPI.login();
      results.tests.login = { success: true, message: 'Login successful' };
    } catch (error) {
      results.tests.login = { success: false, error: error.message };
      results.errors.push(`Login failed: ${error.message}`);
    }

    // Test 2: Get services
    try {
      const services = await tradingNetworkAPI.getServices(systemId, stationNumber);
      results.tests.services = { 
        success: true, 
        count: services.length,
        services: services.slice(0, 3) // First 3 for brevity
      };
    } catch (error) {
      results.tests.services = { success: false, error: error.message };
      results.errors.push(`Services failed: ${error.message}`);
    }

    // Test 3: Get prices
    try {
      const pricesData = await tradingNetworkAPI.getPrices(stationNumber, systemId);
      results.tests.prices = { 
        success: true, 
        count: pricesData.prices?.length || 0,
        sample: pricesData.prices?.slice(0, 2) // First 2 for brevity
      };
    } catch (error) {
      results.tests.prices = { success: false, error: error.message };
      results.errors.push(`Prices failed: ${error.message}`);
    }

    // Test 4: Get tanks
    try {
      // Import equipment service dynamically
      const { currentSupabaseEquipmentAPI } = await import('../../services/equipmentSupabase');
      
      const stationToUuidMapping: Record<number, string> = {
        1: '9baf5375-9929-4774-8366-c0609b9f2a51',
        2: 'point2',
        3: 'f2566905-c748-4240-ac31-47b626ab625d',
        4: 'point4',
        5: 'f7963207-2732-4fae-988e-c73eef7645ca',
      };
      
      const tradingPointId = stationToUuidMapping[stationNumber] || `point${stationNumber}`;
      
      const equipmentResponse = await currentSupabaseEquipmentAPI.list({
        trading_point_id: tradingPointId,
        limit: 100
      });

      const tanks = equipmentResponse.data
        .filter(eq => eq.system_type === 'fuel_tank' && eq.status !== 'deleted');

      results.tests.tanks = { 
        success: true, 
        count: tanks.length,
        sample: tanks.slice(0, 2).map(t => ({
          name: t.display_name,
          fuel_type: t.params?.['Тип топлива']
        }))
      };
    } catch (error) {
      results.tests.tanks = { success: false, error: error.message };
      results.errors.push(`Tanks failed: ${error.message}`);
    }

    results.summary = {
      total_tests: 4,
      successful_tests: Object.values(results.tests).filter((t: any) => t?.success).length,
      failed_tests: results.errors.length
    };

    res.json(results);

  } catch (error) {
    console.error('❌ [DEBUG] Error in full chain test:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      station: req.params.stationNumber
    });
  }
});

export { router as debugRouter };