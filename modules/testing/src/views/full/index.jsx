import React from 'react'
import { Button, Grid, Row, Col, Glyphicon } from 'react-bootstrap'
import style from './style.scss'
import Scenario from './Scenario'
import ScenarioRecorder from './ScenarioRecorder'

export default class Testing extends React.Component {
  state = {
    scenarios: [],
    isRunning: false,
    recordView: false,
    contentElements: []
  }

  componentDidMount() {
    this.loadScenarios()
  }

  loadScenarios = async () => {
    const { data } = await this.props.bp.axios.get('/mod/testing/scenarios')
    this.setState({ scenarios: data.scenarios, status: data.status })

    if (data.status && !data.status.replaying && this.interval) {
      clearInterval(this.interval)
      this.setState({ isRunning: false })
    }

    this.fetchPreviews(this.extractElementIds(data.scenarios))
  }

  runAll = async () => {
    if (this.state.isRunning) {
      return
    }

    this.setState({ isRunning: true })
    await this.props.bp.axios.get('/mod/testing/runAll')

    if (!this.interval) {
      this.loadScenarios()
      this.interval = setInterval(this.loadScenarios, 2000)
    }
  }

  extractElementIds(scenarios) {
    const filtered = scenarios.filter(x => x.mismatch && x.mismatch.expected && x.mismatch.received)
    const allResponses = filtered.reduce((acc, { mismatch }) => {
      const allReplies = [...mismatch.expected.botReplies, ...mismatch.received.botReplies]
      acc = [...acc, ...allReplies.map(x => x.botResponse)]
      return acc
    }, [])

    return _.uniq(allResponses.filter(_.isString))
  }

  fetchPreviews = async elementIds => {
    const { data } = await this.props.bp.axios.post('/mod/testing/fetchPreviews', { elementIds })
    this.setState({ contentElements: data })
  }

  renderSummary = () => {
    const total = this.state.scenarios.length
    const failCount = this.state.scenarios.filter(s => s.status === 'fail').length
    const passCount = this.state.scenarios.filter(s => s.status === 'pass').length // we don't do a simple substraction in case some are pending
    return (
      <div className={style.summary}>
        <strong>Total: {total}</strong>
        {!!failCount && <strong className="text-danger">Failed: {failCount}</strong>}
        {!!passCount && <strong className="text-success">Passed: {passCount}</strong>}
      </div>
    )
  }

  toggleRecordView = () => {
    this.setState({ recordView: !this.state.recordView })
  }

  renderRecorder = () => {
    return <ScenarioRecorder bp={this.props.bp} onSave={this.loadScenarios} cancel={this.toggleRecordView} />
  }

  renderScenarios = () => {
    return (
      <Grid>
        <Row>
          <Col md={7} mdOffset={1}>
            <h2>Scenarios</h2>
            {this.renderSummary()}
          </Col>
          <Col md={3}>
            <div className="pull-right">
              <Button onClick={this.runAll} disabled={this.state.isRunning}>
                <Glyphicon glyph="play" /> Run All
              </Button>
              &nbsp;
              <Button onClick={this.toggleRecordView}>
                <Glyphicon glyph="record " /> Record new
              </Button>
            </div>
          </Col>
        </Row>
        {this.state.scenarios.map(s => (
          <Row key={s.name}>
            <Col md={10} mdOffset={1}>
              <Scenario scenario={s} contentElements={this.state.contentElements} bp={this.props.bp} />
            </Col>
          </Row>
        ))}
      </Grid>
    )
  }

  render() {
    return (
      <div className={style.workspace}>{this.state.recordView ? this.renderRecorder() : this.renderScenarios()}</div>
    )
  }
}