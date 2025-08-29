import { Foundation_To_Features, ProductSchema } from '../../shared/contracts/agent-interfaces';
import { ValidationResult, ValidationError, Alert, AlertType } from '../inventory/types';

// Business rules configuration
interface BusinessRuleConfig {
  id: string;
  name: string;
  description: string;
  category: 'validation' | 'alert' | 'automation' | 'compliance';
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  conditions: RuleCondition[];
  actions: RuleAction[];
  businessId: string;
  createdBy: string;
  createdAt: Date;
  lastModified: Date;
}

interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'between' | 'exists' | 'custom';
  value: any;
  customLogic?: string; // For complex conditions
}

interface RuleAction {
  type: 'validate' | 'alert' | 'block' | 'auto_correct' | 'notify' | 'log' | 'custom';
  parameters: Record<string, any>;
}

interface RuleExecution {
  ruleId: string;
  executionId: string;
  triggeredBy: string;
  triggeredAt: Date;
  input: any;
  result: {
    matched: boolean;
    actions: RuleActionResult[];
    executionTime: number;
  };
}

interface RuleActionResult {
  action: RuleAction;
  success: boolean;
  output?: any;
  error?: string;
}

export class BusinessRules {
  private rules: Map<string, BusinessRuleConfig> = new Map();
  private ruleExecutions: RuleExecution[] = [];

  constructor(private foundation: Foundation_To_Features) {
    this.initializeDefaultRules();
  }

  // Validation rules
  validateQuantity(
    product: ProductSchema,
    newQuantity: number,
    previousQuantity: number,
    context: {
      userId: string;
      sessionId?: string;
      location: string;
      timestamp: Date;
    }
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Apply all relevant validation rules
    const validationRules = this.getActiveRules('validation');
    
    for (const rule of validationRules) {
      try {
        const ruleResult = this.executeValidationRule(rule, {
          product,
          newQuantity,
          previousQuantity,
          context
        });

        if (!ruleResult.valid) {
          if (ruleResult.severity === 'error') {
            errors.push(...ruleResult.errors);
          } else {
            warnings.push(...ruleResult.warnings);
          }
        }
      } catch (error) {
        console.error(`Rule execution failed for ${rule.id}:`, error);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Alert condition checking
  checkAlertConditions(
    product: ProductSchema,
    currentQuantity: number,
    context?: any
  ): Alert[] {
    const alerts: Alert[] = [];
    const alertRules = this.getActiveRules('alert');

    for (const rule of alertRules) {
      try {
        const shouldTrigger = this.evaluateRuleConditions(rule, {
          product,
          currentQuantity,
          context
        });

        if (shouldTrigger) {
          const alert = this.createAlertFromRule(rule, product, currentQuantity, context);
          alerts.push(alert);
        }
      } catch (error) {
        console.error(`Alert rule execution failed for ${rule.id}:`, error);
      }
    }

    return alerts;
  }

  // Default business rules
  private initializeDefaultRules(): void {
    // Negative quantity validation
    this.addRule({
      id: 'no_negative_quantity',
      name: 'No Negative Quantities',
      description: 'Prevent negative inventory quantities',
      category: 'validation',
      enabled: true,
      priority: 'high',
      conditions: [{
        field: 'newQuantity',
        operator: 'less_than',
        value: 0
      }],
      actions: [{
        type: 'validate',
        parameters: {
          error: 'Quantity cannot be negative',
          code: 'NEGATIVE_QUANTITY',
          severity: 'error'
        }
      }],
      businessId: 'default',
      createdBy: 'system',
      createdAt: new Date(),
      lastModified: new Date()
    });

    // Large quantity change warning
    this.addRule({
      id: 'large_quantity_change',
      name: 'Large Quantity Change Warning',
      description: 'Warn about unusually large quantity changes',
      category: 'validation',
      enabled: true,
      priority: 'medium',
      conditions: [{
        field: 'quantityChangePercent',
        operator: 'greater_than',
        value: 2.0 // 200% change
      }],
      actions: [{
        type: 'validate',
        parameters: {
          error: 'Large quantity change detected - please verify',
          code: 'LARGE_CHANGE',
          severity: 'warning'
        }
      }],
      businessId: 'default',
      createdBy: 'system',
      createdAt: new Date(),
      lastModified: new Date()
    });

    // Low stock alert
    this.addRule({
      id: 'low_stock_alert',
      name: 'Low Stock Alert',
      description: 'Alert when inventory falls below reorder point',
      category: 'alert',
      enabled: true,
      priority: 'high',
      conditions: [{
        field: 'currentQuantity',
        operator: 'less_than',
        value: 'product.reorderPoint'
      }],
      actions: [{
        type: 'alert',
        parameters: {
          type: 'low_stock',
          severity: 'high',
          title: 'Low Stock Alert',
          message: 'Product {product.name} is below reorder point ({currentQuantity}/{product.reorderPoint})'
        }
      }],
      businessId: 'default',
      createdBy: 'system',
      createdAt: new Date(),
      lastModified: new Date()
    });

    // Zero stock alert
    this.addRule({
      id: 'zero_stock_alert',
      name: 'Out of Stock Alert',
      description: 'Critical alert when inventory reaches zero',
      category: 'alert',
      enabled: true,
      priority: 'critical',
      conditions: [{
        field: 'currentQuantity',
        operator: 'equals',
        value: 0
      }],
      actions: [{
        type: 'alert',
        parameters: {
          type: 'zero_stock',
          severity: 'critical',
          title: 'Out of Stock',
          message: 'Product {product.name} is out of stock'
        }
      }],
      businessId: 'default',
      createdBy: 'system',
      createdAt: new Date(),
      lastModified: new Date()
    });

    // High value item counting requirement
    this.addRule({
      id: 'high_value_verification',
      name: 'High Value Item Verification',
      description: 'Require photo verification for high value items',
      category: 'validation',
      enabled: true,
      priority: 'high',
      conditions: [{
        field: 'product.value',
        operator: 'greater_than',
        value: 1000
      }],
      actions: [{
        type: 'validate',
        parameters: {
          error: 'High value items require photo verification',
          code: 'PHOTO_REQUIRED',
          severity: 'error',
          requirePhoto: true
        }
      }],
      businessId: 'default',
      createdBy: 'system',
      createdAt: new Date(),
      lastModified: new Date()
    });

    // Rapid counting detection
    this.addRule({
      id: 'rapid_counting_detection',
      name: 'Rapid Counting Detection',
      description: 'Detect suspiciously rapid counting patterns',
      category: 'validation',
      enabled: true,
      priority: 'medium',
      conditions: [{
        field: 'timeSinceLastCount',
        operator: 'less_than',
        value: 5000 // 5 seconds
      }],
      actions: [{
        type: 'validate',
        parameters: {
          error: 'Counting too rapidly - please slow down for accuracy',
          code: 'RAPID_COUNTING',
          severity: 'warning'
        }
      }],
      businessId: 'default',
      createdBy: 'system',
      createdAt: new Date(),
      lastModified: new Date()
    });

    // Overstock warning
    this.addRule({
      id: 'overstock_alert',
      name: 'Overstock Alert',
      description: 'Alert when inventory exceeds maximum stock level',
      category: 'alert',
      enabled: true,
      priority: 'medium',
      conditions: [{
        field: 'currentQuantity',
        operator: 'greater_than',
        value: 'product.maxStock'
      }],
      actions: [{
        type: 'alert',
        parameters: {
          type: 'overstocked',
          severity: 'medium',
          title: 'Overstock Alert',
          message: 'Product {product.name} is overstocked ({currentQuantity}/{product.maxStock})'
        }
      }],
      businessId: 'default',
      createdBy: 'system',
      createdAt: new Date(),
      lastModified: new Date()
    });
  }

  // Rule management
  addRule(rule: BusinessRuleConfig): void {
    this.rules.set(rule.id, rule);
  }

  updateRule(ruleId: string, updates: Partial<BusinessRuleConfig>): void {
    const existingRule = this.rules.get(ruleId);
    if (existingRule) {
      const updatedRule = {
        ...existingRule,
        ...updates,
        lastModified: new Date()
      };
      this.rules.set(ruleId, updatedRule);
    }
  }

  deleteRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  enableRule(ruleId: string): void {
    this.updateRule(ruleId, { enabled: true });
  }

  disableRule(ruleId: string): void {
    this.updateRule(ruleId, { enabled: false });
  }

  getRule(ruleId: string): BusinessRuleConfig | undefined {
    return this.rules.get(ruleId);
  }

  getRules(category?: string): BusinessRuleConfig[] {
    const allRules = Array.from(this.rules.values());
    return category ? allRules.filter(rule => rule.category === category) : allRules;
  }

  private getActiveRules(category: string): BusinessRuleConfig[] {
    return Array.from(this.rules.values())
      .filter(rule => rule.enabled && rule.category === category)
      .sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));
  }

  private getPriorityWeight(priority: string): number {
    const weights = { critical: 4, high: 3, medium: 2, low: 1 };
    return weights[priority] || 1;
  }

  // Rule execution
  private executeValidationRule(rule: BusinessRuleConfig, input: any): any {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    try {
      const matched = this.evaluateRuleConditions(rule, input);
      
      if (matched) {
        const actionResults = this.executeRuleActions(rule.actions, input);
        const errors: ValidationError[] = [];
        const warnings: ValidationError[] = [];

        actionResults.forEach(result => {
          if (result.success && result.action.type === 'validate') {
            const params = result.action.parameters;
            const error: ValidationError = {
              code: params.code,
              message: params.error,
              field: 'quantity',
              severity: params.severity
            };

            if (params.severity === 'error') {
              errors.push(error);
            } else {
              warnings.push(error);
            }
          }
        });

        this.logRuleExecution(rule.id, executionId, input, {
          matched: true,
          actions: actionResults,
          executionTime: Date.now() - startTime
        });

        return {
          valid: errors.length === 0,
          errors,
          warnings
        };
      }

      return { valid: true, errors: [], warnings: [] };

    } catch (error) {
      console.error(`Rule execution error for ${rule.id}:`, error);
      return { valid: true, errors: [], warnings: [] };
    }
  }

  private evaluateRuleConditions(rule: BusinessRuleConfig, input: any): boolean {
    return rule.conditions.every(condition => this.evaluateCondition(condition, input));
  }

  private evaluateCondition(condition: RuleCondition, input: any): boolean {
    const fieldValue = this.getFieldValue(condition.field, input);
    const conditionValue = this.resolveValue(condition.value, input);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === conditionValue;
      
      case 'not_equals':
        return fieldValue !== conditionValue;
      
      case 'greater_than':
        return Number(fieldValue) > Number(conditionValue);
      
      case 'less_than':
        return Number(fieldValue) < Number(conditionValue);
      
      case 'contains':
        return String(fieldValue).includes(String(conditionValue));
      
      case 'between':
        const [min, max] = Array.isArray(conditionValue) ? conditionValue : [0, conditionValue];
        const numValue = Number(fieldValue);
        return numValue >= min && numValue <= max;
      
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      
      case 'custom':
        return this.executeCustomCondition(condition.customLogic, input);
      
      default:
        return false;
    }
  }

  private getFieldValue(field: string, input: any): any {
    // Handle nested field access (e.g., "product.name")
    const parts = field.split('.');
    let value = input;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    // Handle calculated fields
    if (field === 'quantityChangePercent') {
      const { newQuantity, previousQuantity } = input;
      if (previousQuantity === 0) return newQuantity > 0 ? Infinity : 0;
      return Math.abs((newQuantity - previousQuantity) / previousQuantity);
    }

    if (field === 'timeSinceLastCount') {
      const { context } = input;
      const lastCountTime = this.getLastCountTime(input.product.id);
      return lastCountTime ? context.timestamp.getTime() - lastCountTime : Infinity;
    }

    return value;
  }

  private resolveValue(value: any, input: any): any {
    // If value is a string that looks like a field reference, resolve it
    if (typeof value === 'string' && value.startsWith('product.')) {
      return this.getFieldValue(value, input);
    }
    return value;
  }

  private executeRuleActions(actions: RuleAction[], input: any): RuleActionResult[] {
    return actions.map(action => {
      try {
        const result = this.executeAction(action, input);
        return {
          action,
          success: true,
          output: result
        };
      } catch (error) {
        return {
          action,
          success: false,
          error: error.message
        };
      }
    });
  }

  private executeAction(action: RuleAction, input: any): any {
    switch (action.type) {
      case 'validate':
        return this.executeValidateAction(action, input);
      
      case 'alert':
        return this.executeAlertAction(action, input);
      
      case 'block':
        throw new Error('Action blocked by business rule');
      
      case 'auto_correct':
        return this.executeAutoCorrectAction(action, input);
      
      case 'notify':
        return this.executeNotifyAction(action, input);
      
      case 'log':
        return this.executeLogAction(action, input);
      
      case 'custom':
        return this.executeCustomAction(action, input);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private executeValidateAction(action: RuleAction, input: any): any {
    // Return validation error information
    return action.parameters;
  }

  private executeAlertAction(action: RuleAction, input: any): any {
    const params = action.parameters;
    const message = this.interpolateMessage(params.message, input);
    
    // This would integrate with the alert system
    return {
      type: params.type,
      severity: params.severity,
      title: params.title,
      message
    };
  }

  private createAlertFromRule(
    rule: BusinessRuleConfig,
    product: ProductSchema,
    currentQuantity: number,
    context: any
  ): Alert {
    const alertAction = rule.actions.find(action => action.type === 'alert');
    const params = alertAction?.parameters || {};

    return {
      id: this.generateId(),
      type: params.type as AlertType,
      severity: params.severity || 'medium',
      title: params.title || rule.name,
      message: this.interpolateMessage(params.message || rule.description, {
        product,
        currentQuantity,
        context
      }),
      productId: product.id,
      businessId: product.businessId,
      createdAt: new Date(),
      metadata: {
        ruleId: rule.id,
        triggeredBy: context?.userId
      }
    };
  }

  private interpolateMessage(template: string, input: any): string {
    return template.replace(/\{([^}]+)\}/g, (match, path) => {
      const value = this.getFieldValue(path, input);
      return value !== undefined ? String(value) : match;
    });
  }

  private executeAutoCorrectAction(action: RuleAction, input: any): any {
    // Implement auto-correction logic based on parameters
    return { corrected: true, newValue: action.parameters.newValue };
  }

  private executeNotifyAction(action: RuleAction, input: any): any {
    // Send notifications to specified recipients
    return { notificationSent: true, recipients: action.parameters.recipients };
  }

  private executeLogAction(action: RuleAction, input: any): any {
    // Log the event
    console.log(`Business rule log:`, {
      level: action.parameters.level || 'info',
      message: action.parameters.message,
      input
    });
    return { logged: true };
  }

  private executeCustomAction(action: RuleAction, input: any): any {
    // Execute custom JavaScript code (with proper sandboxing in production)
    try {
      const customFunction = new Function('input', 'params', action.parameters.code);
      return customFunction(input, action.parameters);
    } catch (error) {
      throw new Error(`Custom action execution failed: ${error.message}`);
    }
  }

  private executeCustomCondition(logic: string, input: any): boolean {
    try {
      const customFunction = new Function('input', `return ${logic}`);
      return Boolean(customFunction(input));
    } catch (error) {
      console.error('Custom condition execution failed:', error);
      return false;
    }
  }

  private logRuleExecution(
    ruleId: string,
    executionId: string,
    input: any,
    result: any
  ): void {
    const execution: RuleExecution = {
      ruleId,
      executionId,
      triggeredBy: input.context?.userId || 'system',
      triggeredAt: new Date(),
      input,
      result
    };

    this.ruleExecutions.push(execution);

    // Keep only last 1000 executions to prevent memory issues
    if (this.ruleExecutions.length > 1000) {
      this.ruleExecutions = this.ruleExecutions.slice(-1000);
    }
  }

  // Analytics and reporting
  getRuleExecutionStats(ruleId?: string): any {
    const executions = ruleId ? 
      this.ruleExecutions.filter(e => e.ruleId === ruleId) :
      this.ruleExecutions;

    const total = executions.length;
    const matches = executions.filter(e => e.result.matched).length;
    const avgExecutionTime = total > 0 ? 
      executions.reduce((sum, e) => sum + e.result.executionTime, 0) / total : 0;

    return {
      totalExecutions: total,
      matchedExecutions: matches,
      matchRate: total > 0 ? matches / total : 0,
      averageExecutionTime: avgExecutionTime,
      recentExecutions: executions.slice(-10)
    };
  }

  // Helper methods
  private generateExecutionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getLastCountTime(productId: string): number | null {
    // This would query the database for the last count time
    return null;
  }
}