const chalk = require('chalk')
const fs = require('fs')
const fse = require('fs-extra')
const tools = require('../tools')
const shell = require('shelljs');
module.exports = async function (cmd) {
  const deployConfig = tools.deployConfig
  if (!cmd.env || !deployConfig[cmd.env]) {
    console.log('Please ensure your deploy env is effective')
    shell.exit(1);
    return
  }
  const envConfig = deployConfig[cmd.env]
  const buildCommands = envConfig['buildCommands'] || deployConfig['default']['buildCommands'] || []
  console.log(buildCommands)

  console.log(`--- Empty folder: ${tools.projectSourcePath} ---`)
  fse.emptyDirSync(tools.projectSourcePath)

  shell.cd(tools.projectSourcePath);
  console.log(`--- Clone code ---`)
  if (shell.exec(`git clone -b ${deployConfig[cmd.env]['branch']} ${deployConfig['default']['repositoryUrl']} ./`).code !== 0) {
    shell.echo('Error: Git commit failed')
    shell.exit(1);
    return
  }
  console.log(`--- Clone code to ${tools.projectSourcePath} success, branch: ${deployConfig[cmd.env]['branch']} ---`)

  // 软连接 到 共享文件夹
  let sharedDirs = deployConfig['default']['shared']['dirs']
  if (Array.isArray(sharedDirs)) {
    for (let folderName of sharedDirs) {
      let folderPath = tools.resolve(tools.projectSharedPath, folderName)
      console.log(`create soft link ${tools.resolve(tools.projectSourcePath, folderName)} -> ${folderPath}`)
      fse.ensureSymlinkSync(folderPath, tools.resolve(tools.projectSourcePath, folderName))
    }
  }
  // 软连接 到 共享文件
  let sharedFiles = deployConfig['default']['shared']['files']
  if (Array.isArray(sharedFiles)) {
    for (let fileName of sharedFiles) {
      let filePath = tools.resolve(tools.projectSharedPath, fileName)
      console.log(`Create soft link ${tools.resolve(tools.projectSourcePath, fileName)} -> ${filePath}`)
      fse.ensureSymlinkSync(filePath, tools.resolve(tools.projectSourcePath, fileName))
    }
  }

  console.log('--- Begin Build ---')
  shell.cd(tools.projectSourcePath);
  for (let command of buildCommands) {
    console.log(`Run: ${command}`)
    if (shell.exec(`${command}`).code !== 0) {
      shell.echo(`Run: ${command} Error`)
      shell.exit(1);
      return
    }
  }

  console.log('archive deploy files')

  let archiveRootPath = tools.projectSourcePath
  console.log(deployConfig['default']['archive'])
  if (deployConfig['default']['archive']['rootDir']) {
    archiveRootPath = tools.resolve(archiveRootPath, deployConfig['default']['archive']['rootDir'])
  }

  console.log(`Archive root path: ${archiveRootPath}`)
  shell.cd(archiveRootPath);
  console.log(`Begin Archive file`)
  let buildToPath = tools.resolve(tools.projectPath, 'build.tar.gz')
  // await tools.archive(archivePaths, buildToPath)
  if (shell.exec(`tar -zcvf ${buildToPath} ${deployConfig['default']['archive']['only'].join(' ')}`).code !== 0) {
    shell.echo('Error: archive file error')
    shell.exit(1)
    return
  }

  console.log(`--- Archive file to: ${buildToPath} ---`)


  console.log('--- Success Build ---')



  // 1. 克隆代码

  // if (cmd.env) {
  //   serverConfig = serverConfig.filter(key => key === cmd.env )
  // }
  // console.log(chalk.blue(`will deploy server env: ${serverConfig}`))
  // for (let key of serverConfig) {
  //   console.log(chalk.blue(`=== begin deploy server env: ${key} ===`))
  //   let sshGroup = new tools.SshGroup(deployConfig[key]['servers'])
  //   await sshGroup.connect()
  //   let deployTo = deployConfig['default']['deployTo']
  //
  //   await sshGroup.close()
  // }
}