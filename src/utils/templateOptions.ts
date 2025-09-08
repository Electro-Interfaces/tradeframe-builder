/**
 * Константы для опций шаблонов команд
 */

export const TEMPLATE_SCOPE_OPTIONS = [
  { 
    value: 'network', 
    label: 'Network', 
    description: 'Template for entire network operations' 
  },
  { 
    value: 'trading_point', 
    label: 'Trading Point', 
    description: 'Template for individual trading point operations' 
  },
  { 
    value: 'equipment', 
    label: 'Equipment', 
    description: 'Template for equipment-specific operations' 
  },
  { 
    value: 'component', 
    label: 'Component', 
    description: 'Template for component-level operations' 
  }
];

export const TEMPLATE_MODE_OPTIONS = [
  { 
    value: 'pull', 
    label: 'Pull Mode', 
    description: 'Fetch data from external system' 
  },
  { 
    value: 'push', 
    label: 'Push Mode', 
    description: 'Send data to external system' 
  }
];

export const HTTP_METHOD_OPTIONS = [
  { 
    value: 'GET', 
    label: 'GET', 
    description: 'Retrieve data from server' 
  },
  { 
    value: 'POST', 
    label: 'POST', 
    description: 'Create new resource' 
  },
  { 
    value: 'PUT', 
    label: 'PUT', 
    description: 'Update existing resource completely' 
  },
  { 
    value: 'PATCH', 
    label: 'PATCH', 
    description: 'Partially update existing resource' 
  },
  { 
    value: 'DELETE', 
    label: 'DELETE', 
    description: 'Remove existing resource' 
  }
];