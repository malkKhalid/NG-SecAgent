import axios from 'axios';
import { LogEntry, SystemStats, OSType } from '../types';

const API_URL = 'http://localhost:5000/api';

export const apiService = {
  async getStatus(): Promise<{ status: string; os_info: any; ai_status: string }> {
    try {
      const response = await axios.get(`${API_URL}/status`);
      return response.data;
    } catch (error) {
      console.error('Error fetching status:', error);
      return { status: 'Offline', os_info: {}, ai_status: 'Unknown' };
    }
  },

  async getLogs(): Promise<LogEntry[]> {
    try {
      const response = await axios.get(`${API_URL}/logs`);
      return response.data;
    } catch (error) {
      console.error('Error fetching logs:', error);
      return [];
    }
  },

  async getStats(): Promise<SystemStats> {
    try {
      const response = await axios.get(`${API_URL}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching stats:', error);
      return {
        totalLogs: 0,
        anomalies: 0,
        criticals: 0,
        os: OSType.LINUX,
        status: 'Offline',
        cpuLoad: 0
      };
    }
  }
};
