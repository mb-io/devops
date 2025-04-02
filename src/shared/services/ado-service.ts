import { warning } from '@actions/core';
import * as azdev from 'azure-devops-node-api';
import { WorkItem } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces';

/**
 * A service to interact with Azure DevOps (ADO) API
 */
export class AdoService {
  private readonly adoConnection: azdev.WebApi;

  constructor(adoToken: string, adoUrl: string) {
    if (!adoToken) {
      throw new Error('ADO token is required');
    }
    if (!adoUrl) {
      throw new Error('ADO token is required');
    }

    const adoAuthHandler = azdev.getPersonalAccessTokenHandler(adoToken);
    this.adoConnection = new azdev.WebApi(adoUrl, adoAuthHandler);
  }

  /**
   * Fetches the work item by id
   * @param workItemId The id of the work item to fetch
   * @returns {Promise<WorkItem>} A promise that resolves to the work item
   */
  async getWorkItemById(workItemId: number): Promise<WorkItem | null> {
    try {
      const workItemTrackingApi =
        await this.adoConnection.getWorkItemTrackingApi();
      const workItem = await workItemTrackingApi.getWorkItem(workItemId);
      return workItem;
    } catch (error) {
      warning(`Error fetching work item by id ${workItemId}: ${error}`);
      return null;
    }
  }

  /**
   * Fetches the work item state by id
   * @param workItemId The id of the work item to fetch
   * @returns {Promise<string>} A promise that resolves to the work item state
   */
  async getWorkItemState(workItemId: number) {
    const workItem = await this.getWorkItemById(workItemId);
    return workItem?.fields?.['System.State'] ?? 'Unknown';
  }
}
