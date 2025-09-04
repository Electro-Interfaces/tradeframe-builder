import { Router, Request, Response } from 'express';
import { RoleService } from '../../services/roleService';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Test route works without any auth!' });
});

router.post('/create-role', async (req: Request, res: Response) => {
  try {
    const roleData = req.body;
    console.log('Creating test role:', roleData);
    
    const createdRole = await RoleService.createRole(roleData);
    
    res.json({
      success: true,
      message: 'Role created successfully',
      role: createdRole
    });
  } catch (error) {
    console.error('Error creating test role:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create role',
      details: error
    });
  }
});

router.post('/create-system-roles', async (req: Request, res: Response) => {
  try {
    console.log('Creating default system roles...');
    
    const createdRoles = await RoleService.createDefaultSystemRoles('default');
    
    res.json({
      success: true,
      message: 'System roles created successfully',
      roles: createdRoles,
      count: createdRoles.length
    });
  } catch (error) {
    console.error('Error creating system roles:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create system roles',
      details: error
    });
  }
});

export { router as testRouter };