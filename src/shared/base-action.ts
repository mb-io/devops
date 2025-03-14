import { setOutput } from '@actions/core';

export abstract class BaseAction {
  abstract inputs: { [key: string]: any };
  protected outputs: { [key: string]: any } = {};
  protected abstract executeActionAsync(): Promise<void>;

  async run() {
    if (process.env.GENERATE_ACTION_YML) {
      return;
    }

    try {
      await this.executeActionAsync();
    } finally {
      this.setOutputs();
    }
  }

  private readonly setOutputs = () => {
    Object.keys(this.outputs).forEach((output) => {
      const value = this.outputs[output];
      setOutput(output, value);
    });
  };
}
